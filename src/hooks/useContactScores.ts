import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useUpdateContactScores() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      scores,
    }: {
      contactId: string;
      scores: {
        icp_fit_score?: number;
        engagement_score?: number;
        pare_score?: number;
      };
    }) => {
      const { error } = await workspaceClient
        .from("contacts")
        .update({ ...scores, updated_by: user?.id })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact"] });
      toast.success("Scores atualizados");
    },
    onError: () => {
      toast.error("Erro ao atualizar scores");
    },
  });
}
