import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Input {
  activityId: string;
  leadId: string;
  /**
   * Se true, limpa next_action_* do perfil LeadChef (assumindo que era esta a próxima ação).
   */
  clearNextAction?: boolean;
  profileId?: string;
  note?: string;
}

export function useCompleteLeadChefActivity() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");

      // Buscar metadata atual para preservar campos
      const { data: cur } = await supabase
        .from("crm_activities")
        .select("metadata")
        .eq("id", input.activityId)
        .maybeSingle();
      const meta = (cur?.metadata as Record<string, unknown>) || {};
      const newMeta = {
        ...meta,
        completed_at: new Date().toISOString(),
        ...(input.note ? { completion_note: input.note } : {}),
      };

      const { error } = await supabase
        .from("crm_activities")
        .update({ metadata: newMeta as any })
        .eq("id", input.activityId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      if (input.clearNextAction && input.profileId) {
        await (supabase as any)
          .from("leadchef_lead_profiles")
          .update({
            next_action_type: null,
            next_action_at: null,
            next_action_note: null,
          })
          .eq("id", input.profileId)
          .eq("workspace_id", workspaceId);
      }

      return input;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["leadchef-activities", workspaceId, vars.leadId] });
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Ação marcada como feita.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao concluir ação."),
  });
}
