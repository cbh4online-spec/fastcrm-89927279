import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFastMatchProfile } from "./useFastMatchProfile";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

export interface FastMatchConnection {
  id: string;
  workspace_id: string;
  profile_a_id: string;
  profile_b_id: string;
  unlocked_at: string;
  unlocked_by: string;
  credits_consumed: number;
  source: string;
  crm_opportunity_id: string | null;
  crm_contact_id: string | null;
  crm_company_id: string | null;
  status: string;
  created_at: string;
}

export function useFastMatchConnections() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();

  return useQuery({
    queryKey: ["fastmatch-connections", currentWorkspace?.id, profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("fastmatch_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", "active")
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as FastMatchConnection[];
    },
    enabled: !!profile && !!currentWorkspace,
  });
}

export function useUnlockConnection() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otherProfileId, quotaSource }: { otherProfileId: string; quotaSource: string }) => {
      if (!profile || !currentWorkspace) throw new Error("Not authenticated");

      // 1. Insert connection
      const { data: connection, error } = await supabase
        .from("fastmatch_connections")
        .insert({
          workspace_id: currentWorkspace.id,
          profile_a_id: profile.id,
          profile_b_id: otherProfileId,
          unlocked_by: profile.user_id,
          source: quotaSource,
        })
        .select()
        .single();

      if (error) throw error;

      // Emit FASTMATCH.ACCEPTED kernel event
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'FASTMATCH.ACCEPTED',
        entity_kind: 'fastmatch_connection',
        entity_id: (connection as any).id,
        actor_id: profile.user_id,
        source_module: 'crm-fastmatch',
        payload: {
          profile_a_id: profile.id,
          profile_b_id: otherProfileId,
          source: quotaSource,
        },
      });

      // 2. Fetch other profile for CRM auto-create
      const { data: otherProfile } = await supabase
        .from("fastmatch_profiles")
        .select("*")
        .eq("id", otherProfileId)
        .single();

      if (!otherProfile) return connection as FastMatchConnection;

      const companyName = (otherProfile as any).company_name || "Empresa FastMatch";
      const industry = (otherProfile as any).industry || null;

      try {
        // 3. Find or create company
        let companyId: string | null = null;
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("name", companyName)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabase
            .from("companies")
            .insert({
              workspace_id: currentWorkspace.id,
              created_by: profile.user_id,
              name: companyName,
              industry,
              source: "fastmatch",
              tags: ["fastmatch"],
            })
            .select("id")
            .single();
          companyId = newCompany?.id || null;
        }

        // 4. Find or create contact
        let contactId: string | null = null;
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("company_id", companyId!)
          .eq("source", "fastmatch")
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact } = await supabase
            .from("contacts")
            .insert({
              workspace_id: currentWorkspace.id,
              created_by: profile.user_id,
              name: companyName,
              company: companyName,
              company_id: companyId,
              source: "fastmatch",
              tags: ["fastmatch"],
            })
            .select("id")
            .single();
          contactId = newContact?.id || null;
        }

        // 5. Find FastMatch pipeline & first stage
        const { data: pipeline } = await supabase
          .from("pipelines")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("name", "FastMatch")
          .maybeSingle();

        let stageId: string | null = null;
        if (pipeline) {
          const { data: firstStage } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("pipeline_id", pipeline.id)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle();
          stageId = firstStage?.id || null;
        }

        // 6. Create opportunity
        let opportunityId: string | null = null;
        if (stageId) {
          const { data: opp } = await supabase
            .from("opportunities")
            .insert({
              workspace_id: currentWorkspace.id,
              title: `FastMatch — ${companyName}`,
              stage_id: stageId,
              contact_id: contactId,
              company_id: companyId,
              source: "fastmatch",
              status: "open",
              owner_id: profile.user_id,
            })
            .select("id")
            .single();
          opportunityId = opp?.id || null;
        }

        // 7. Update connection with CRM IDs
        await supabase
          .from("fastmatch_connections")
          .update({
            crm_opportunity_id: opportunityId,
            crm_contact_id: contactId,
            crm_company_id: companyId,
          })
          .eq("id", (connection as any).id);

        console.log(`[FASTMATCH] CRM provisioned: company=${companyId}, contact=${contactId}, opportunity=${opportunityId}`);

        return {
          ...(connection as any),
          crm_opportunity_id: opportunityId,
          crm_contact_id: contactId,
          crm_company_id: companyId,
        } as FastMatchConnection;
      } catch (crmError) {
        console.error("[FASTMATCH] CRM auto-create failed:", crmError);
        // Return connection even if CRM creation fails
        return connection as FastMatchConnection;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-connections"] });
      queryClient.invalidateQueries({ queryKey: ["fastmatch-profile"] });
      queryClient.invalidateQueries({ queryKey: ["fastmatch-discovery"] });
      console.log('[FASTMATCH] Connection unlocked');
      toast.success("Conexão desbloqueada com sucesso!");
    },
    onError: (err: any) => {
      console.warn('[FASTMATCH] UNLOCK_FAILED', err?.message);
      toast.error("Erro ao desbloquear conexão.");
    },
  });
}
