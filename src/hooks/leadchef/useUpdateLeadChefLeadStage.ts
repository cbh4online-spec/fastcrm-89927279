import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UpdateLeadChefLeadStageInput, LeadChefStage } from "@/types/leadchef";

const FINAL_STATUS_MAP: Partial<Record<LeadChefStage, string>> = {
  won: "completed",
  lost: "completed",
};

export function useUpdateLeadChefLeadStage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: UpdateLeadChefLeadStageInput) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      const { error: profErr } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .update({ stage: input.stage })
        .eq("id", input.profileId)
        .eq("workspace_id", workspaceId);
      if (profErr) throw profErr;

      // Sincronizar leads.status apenas em estados finais.
      const leadStatus = FINAL_STATUS_MAP[input.stage];
      if (leadStatus) {
        const { error: leadErr } = await supabase
          .from("leads")
          .update({ status: leadStatus } as any)
          .eq("id", input.leadId)
          .eq("workspace_id", workspaceId);
        if (leadErr) console.warn("[LeadChef] Falha a sincronizar leads.status:", leadErr);
      }

      // Atividade de histórico (best-effort)
      try {
        await supabase.from("crm_activities").insert({
          workspace_id: workspaceId,
          entity_type: "lead",
          entity_id: input.leadId,
          lead_id: input.leadId,
          activity_type: "note",
          title: `LeadChef: etapa atualizada para ${input.stage}`,
          metadata: { source: "leadchef", stage: input.stage },
          performed_by: user?.id || null,
        } as any);
      } catch (e) {
        console.warn("[LeadChef] Falha ao registar atividade de stage:", e);
      }

      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadchef-leads"] });
      queryClient.invalidateQueries({ queryKey: ["leadchef-lead"] });
      queryClient.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Etapa atualizada.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível atualizar a etapa.");
    },
  });
}
