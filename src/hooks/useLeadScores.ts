import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useUpdateLeadScores() {
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      scores,
    }: {
      leadId: string;
      scores: {
        icp_fit_score?: number;
        engagement_score?: number;
        pare_score?: number;
      };
    }) => {
      const { error } = await workspaceClient
        .from("leads")
        .update(scores as any)
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
      toast.success("Scores atualizados");
    },
    onError: () => {
      toast.error("Erro ao atualizar scores");
    },
  });
}
