import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useDriftScores(scopeType?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: scores, isLoading } = useQuery({
    queryKey: ['drift-scores', workspaceId, scopeType],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('drift_scores')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (scopeType) query = query.eq('scope_type', scopeType);
      const { data, error } = await query.order('score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const workspaceScore = scores?.find(s => s.scope_type === 'workspace')?.score ?? 0;

  return { scores, workspaceScore, isLoading };
}
