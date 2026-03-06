import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelActions() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: registry } = useQuery({
    queryKey: ['kernel-actions-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kernel_actions_registry')
        .select('*')
        .eq('enabled', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: runs, isLoading } = useQuery({
    queryKey: ['kernel-action-runs', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_action_runs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`kernel-action-runs-rt-${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kernel_action_runs',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['kernel-action-runs', workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  const todayRuns = runs?.filter(r => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(r.created_at) >= today;
  }) ?? [];

  // Meaningful runs: failed and running first, then queued
  const meaningfulRuns = todayRuns.filter(r => r.status !== 'success');
  const successCount = todayRuns.filter(r => r.status === 'success').length;

  return { registry, runs, todayRuns, meaningfulRuns, successCount, isLoading };
}
