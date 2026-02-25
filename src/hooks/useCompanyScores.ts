import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useUpdateCompanyScores() {
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      scores,
    }: {
      companyId: string;
      scores: {
        icp_fit_score?: number;
        pare_score?: number;
      };
    }) => {
      const { error } = await workspaceClient
        .from("companies")
        .update({ ...scores, updated_by: user?.id })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Scores atualizados");
    },
    onError: () => {
      toast.error("Erro ao atualizar scores");
    },
  });
}
