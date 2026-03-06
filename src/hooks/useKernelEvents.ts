import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelEvents(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`kernel-events-rt-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'kernel_events',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['kernel-events', workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  return query;
}
