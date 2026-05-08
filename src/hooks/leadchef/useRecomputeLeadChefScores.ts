import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useRecomputeLeadChefScores() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (leadId?: string) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("leadchef-score-lead", {
        body: { workspaceId, leadId },
      });
      if (error) throw error;
      return data as { updated: number; total: number };
    },
    onSuccess: (data) => {
      toast.success(`Scores atualizados (${data.updated}/${data.total})`);
      queryClient.invalidateQueries({ queryKey: ["leadchef", "lead-score"] });
      queryClient.invalidateQueries({ queryKey: ["leadchef", "top-scores"] });
      queryClient.invalidateQueries({ queryKey: ["leadchef", "cold-leads"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro a recalcular scores");
    },
  });
}
