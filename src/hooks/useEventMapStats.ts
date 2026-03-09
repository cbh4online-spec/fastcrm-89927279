import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useEventMapStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const volume = useQuery({
    queryKey: ['event-map-volume', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from('kernel_events')
        .select('event_name, type, status, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const liveEvents = useQuery({
    queryKey: ['event-map-live', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_events')
        .select('id, type, event_name, entity_kind, entity_id, source_module, status, created_at, payload')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });

  const failedEvents = useQuery({
    queryKey: ['event-map-failed', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_events')
        .select('id, type, event_name, entity_kind, entity_id, source_module, status, created_at, payload')
        .eq('workspace_id', workspaceId)
        .in('status', ['failed', 'unregistered', 'inactive'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  return { volume, liveEvents, failedEvents };
}
