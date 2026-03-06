import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

export function useUpdateLeadScores() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
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
      return { leadId, scores };
    },
    onSuccess: ({ leadId, scores }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
      toast.success("Scores atualizados");
      console.log('[LEADS] Scores updated:', leadId);

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LEAD.SCORED',
          entity_kind: 'lead',
          entity_id: leadId,
          actor_type: 'user',
          actor_id: user?.id,
          source_module: 'crm-leads',
          payload: { scores, source: 'manual' },
        });
      }
    },
    onError: (error) => {
      console.warn('[LEADS] SCORE_UPDATE_FAILED', error.message);
      toast.error("Erro ao atualizar scores");
    },
  });
}
