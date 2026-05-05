import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { LeadChefActivityType } from "@/types/leadchef";

interface Input {
  profileId: string;
  next_action_type?: LeadChefActivityType | null;
  next_action_at?: string | null;
  next_action_note?: string | null;
}

export function useUpdateLeadChefNextAction() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const patch: Record<string, unknown> = {};
      if ("next_action_type" in input) patch.next_action_type = input.next_action_type;
      if ("next_action_at" in input) patch.next_action_at = input.next_action_at;
      if ("next_action_note" in input) patch.next_action_note = input.next_action_note;

      const { error } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .update(patch)
        .eq("id", input.profileId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Próxima ação atualizada.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar próxima ação."),
  });
}
