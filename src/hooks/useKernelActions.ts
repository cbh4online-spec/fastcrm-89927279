import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelActions() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

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

  const todayRuns = runs?.filter(r => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(r.created_at) >= today;
  }) ?? [];

  return { registry, runs, todayRuns, isLoading };
}
