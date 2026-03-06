import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelDebug() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const events = useQuery({
    queryKey: ['kernel-debug-events', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from('kernel_events')
        .select('id, type, entity_kind, entity_id, status, created_at, processed_at, source_module')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });

  const actionRuns = useQuery({
    queryKey: ['kernel-debug-actions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from('kernel_action_runs')
        .select('id, action_key, status, error, created_at, finished_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data as any[]) ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });

  const decisions = useQuery({
    queryKey: ['kernel-debug-decisions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from('kernel_decisions')
        .select('id, type, priority, status, summary, created_at, kernel_decision_evidence(id)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });

  const deadletterCount = useQuery({
    queryKey: ['kernel-debug-deadletter', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return 0;
      const { count } = await supabase
        .from('kernel_event_deadletter')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      return count ?? 0;
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });

  const driftScores = useQuery({
    queryKey: ['kernel-debug-drift', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from('drift_scores')
        .select('id, scope_type, scope_kind, scope_id, score, computed_at')
        .eq('workspace_id', workspaceId)
        .order('score', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });

  return {
    events,
    actionRuns,
    decisions,
    deadletterCount,
    driftScores,
    isLoading: events.isLoading || actionRuns.isLoading || decisions.isLoading,
  };
}
