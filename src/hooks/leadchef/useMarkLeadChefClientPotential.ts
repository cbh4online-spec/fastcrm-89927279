import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MarkPotentialInput {
  leadId: string;
  profileId?: string | null;
  potentialReferral?: boolean;
  potentialRecruitment?: boolean;
  note?: string;
}

export function useMarkLeadChefClientPotential() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MarkPotentialInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");

      const patch: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        lead_id: input.leadId,
        created_by: user?.id || null,
      };
      if (input.potentialReferral !== undefined) patch.potential_referral = input.potentialReferral;
      if (input.potentialRecruitment !== undefined) patch.potential_recruitment = input.potentialRecruitment;
      if (input.potentialReferral) patch.status = "potential_referral";
      if (input.potentialRecruitment) patch.status = "potential_recruitment";

      const { data, error } = await (supabase as any)
        .from("leadchef_client_profiles")
        .upsert(patch, { onConflict: "workspace_id,lead_id" })
        .select("*")
        .single();
      if (error) throw error;

      // Atualiza recruitment_potential no perfil de lead também
      if (input.potentialRecruitment !== undefined && input.profileId) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({ recruitment_potential: input.potentialRecruitment })
          .eq("id", input.profileId)
          .eq("workspace_id", currentWorkspace.id);
      }

      try {
        await supabase.from("crm_activities").insert({
          workspace_id: currentWorkspace.id,
          entity_type: "lead",
          entity_id: input.leadId,
          lead_id: input.leadId,
          activity_type: "note",
          title: `LeadChef: potencial ${input.potentialRecruitment ? "recrutamento" : "referência"}`,
          description: input.note || null,
          metadata: {
            source: "leadchef-client",
            potential_referral: input.potentialReferral ?? null,
            potential_recruitment: input.potentialRecruitment ?? null,
          },
          performed_by: user?.id || null,
        } as any);
      } catch (e) {
        console.warn("[LeadChef] histórico potencial falhou", e);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-client"] });
      qc.invalidateQueries({ queryKey: ["leadchef-clients"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      qc.invalidateQueries({ queryKey: ["leadchef-monthly-progress"] });
      toast.success("Potencial atualizado.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível guardar."),
  });
}
