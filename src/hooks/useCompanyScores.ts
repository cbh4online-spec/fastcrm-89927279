import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export function useUpdateCompanyScores() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
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
