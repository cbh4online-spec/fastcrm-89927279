import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelEvents(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['kernel-events', workspaceId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_events')
        .select('id, type, entity_kind, entity_id, actor_type, source_module, created_at, payload')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });
}
