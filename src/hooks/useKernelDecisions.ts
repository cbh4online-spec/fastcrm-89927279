import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      toast.success('Decisão aceite');
    },
  });

  const rejectDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase
        .from('kernel_decisions')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', decisionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      toast.success('Decisão rejeitada');
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kernel-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['kernel-action-runs'] });
      toast.success('Ações executadas');
    },
  });

  return { decisions, openDecisions, approvalQueue, isLoading, acceptDecision, rejectDecision, archiveDecision, executeDecision };
}
