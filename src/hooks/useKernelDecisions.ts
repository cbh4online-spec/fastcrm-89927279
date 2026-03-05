import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { emitKernelEvent } from '@/lib/kernelEmitter';

export function useKernelDecisions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: decisions, isLoading } = useQuery({
    queryKey: ['kernel-decisions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_decisions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const openDecisions = decisions?.filter(d => d.status === 'open') ?? [];
  const approvalQueue = decisions?.filter(d => {
    const policy = d.policy as any;
    return d.status === 'open' && policy?.mode === 'approve';
  }) ?? [];

  const acceptDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase
        .from('kernel_decisions')
        .update({ status: 'accepted', resolved_at: new Date().toISOString() })
        .eq('id', decisionId);
      if (error) throw error;
      return decisionId;
    },
    onSuccess: (decisionId) => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      toast.success('Decisão aceite');
      console.log('[STRATEGY] DECISION_APPROVED', { id: decisionId });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'DECISION.APPROVED',
          entity_kind: 'kernel_decision',
          entity_id: decisionId,
          source_module: 'strategy-command-center',
          payload: { decision_id: decisionId },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] APPROVE_FAILED', { error: (error as Error).message });
    },
  });

  const rejectDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase
        .from('kernel_decisions')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', decisionId);
      if (error) throw error;
      return decisionId;
    },
    onSuccess: (decisionId) => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      toast.success('Decisão rejeitada');
      console.log('[STRATEGY] DECISION_REJECTED', { id: decisionId });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'DECISION.REJECTED',
          entity_kind: 'kernel_decision',
          entity_id: decisionId,
          source_module: 'strategy-command-center',
          payload: { decision_id: decisionId },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] REJECT_FAILED', { error: (error as Error).message });
    },
  });

  const archiveDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase
        .from('kernel_decisions')
        .update({ status: 'archived', resolved_at: new Date().toISOString() })
        .eq('id', decisionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      toast.success('Decisão arquivada');
    },
  });

  const executeDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.functions.invoke('kernel-run-actions', {
        body: { workspace_id: workspaceId, decision_id: decisionId },
      });
      if (error) throw error;
      return decisionId;
    },
    onSuccess: (decisionId) => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['kernel-action-runs'] });
      toast.success('Ações executadas');
      console.log('[STRATEGY] ACTION_EXECUTED', { decision_id: decisionId });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'ACTION.EXECUTED',
          entity_kind: 'kernel_decision',
          entity_id: decisionId,
          source_module: 'strategy-command-center',
          payload: { decision_id: decisionId },
        });
      }
    },
    onError: (error) => {
      console.warn('[STRATEGY] EXECUTE_FAILED', { error: (error as Error).message });
    },
  });

  return { decisions, openDecisions, approvalQueue, isLoading, acceptDecision, rejectDecision, archiveDecision, executeDecision };
}
