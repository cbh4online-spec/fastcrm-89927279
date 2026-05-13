import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCreateLeadChefAuditLog } from "./useCreateLeadChefAuditLog";
import type { CreateLeadChefLeadInput } from "@/types/leadchef";

export function useCreateLeadChefLead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const auditMut = useCreateLeadChefAuditLog();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: CreateLeadChefLeadInput) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      if (!user?.id) throw new Error("Sessão não encontrada.");

      // Plano free: 1 cliente/lead. Após isso → upgrade.
      try {
        const { data: sub } = await supabase.functions.invoke("leadchef-check-subscription", { body: {} });
        const subscribed = !!(sub as any)?.subscribed;
        if (!subscribed) {
          const { count } = await (supabase as any)
            .from("leadchef_lead_profiles")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId);
          if ((count ?? 0) >= 1) {
            const err: any = new Error("Plano gratuito limitado a 1 cliente. Faz upgrade para registar mais.");
            err.code = "LEADCHEF_FREE_LIMIT";
            throw err;
          }
        }
      } catch (e: any) {
        if (e?.code === "LEADCHEF_FREE_LIMIT") throw e;
        console.warn("[LeadChef] check sub falhou", e);
      }

      // 1. Lead na tabela global
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          workspace_id: workspaceId,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          source: input.origin || null,
          status: "new",
          ai_temperature: input.temperature,
          address: input.address?.trim() || null,
          address_number: input.addressNumber?.trim() || null,
          address_floor: input.addressFloor?.trim() || null,
          city: input.city?.trim() || null,
          postal_code: input.postalCode?.trim() || null,
          device_brand: input.deviceBrand?.trim() || null,
          device_model: input.deviceModel?.trim() || null,
          created_by: user.id,
        } as any)
        .select("id")
        .single();
      if (leadErr) throw leadErr;

      // 2. Perfil LeadChef
      const { data: profile, error: profErr } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .insert({
          workspace_id: workspaceId,
          lead_id: lead.id,
          stage: "to_contact",
          interest: input.interest || null,
          origin: input.origin || null,
          temperature: input.temperature,
          next_action_type: input.nextActionType || null,
          next_action_at: input.nextActionAt || null,
          next_action_note: input.nextActionNote || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (profErr) throw profErr;

      // 3. Atividade inicial (best-effort — não bloqueia se falhar)
      try {
        await supabase.from("crm_activities").insert({
          workspace_id: workspaceId,
          entity_type: "lead",
          entity_id: lead.id,
          lead_id: lead.id,
          activity_type: input.nextActionType || "note",
          title: input.nextActionNote
            ? `LeadChef: ${input.nextActionNote}`
            : `LeadChef: novo lead criado`,
          description: input.notes || null,
          metadata: {
            source: "leadchef",
            origin: input.origin,
            interest: input.interest,
            temperature: input.temperature,
          },
          performed_by: user.id,
        } as any);
      } catch (e) {
        console.warn("[LeadChef] Falha ao criar atividade inicial:", e);
      }

      auditMut.mutate({
        action: "lead_created",
        entityType: "leadchef_lead",
        entityId: lead.id,
        description: `Lead "${input.name}" criado`,
        metadata: { origin: input.origin, interest: input.interest, temperature: input.temperature },
      });

      return { leadId: lead.id, profileId: profile.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadchef-leads"] });
      queryClient.invalidateQueries({ queryKey: ["leadchef-today"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["smart-leads"] });
      toast.success("Lead LeadChef criado.");
    },
    onError: (err: any) => {
      if (err?.code === "LEADCHEF_FREE_LIMIT") {
        toast.error(err.message, {
          action: {
            label: "Ver planos",
            onClick: () => { window.location.href = "/dashboard/leadchef/billing"; },
          },
        });
        return;
      }
      toast.error(err?.message || "Não foi possível criar o lead.");
    },
  });
}
