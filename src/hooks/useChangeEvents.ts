import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useChangeEvents(limit = 30) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: changeEvents, isLoading } = useQuery({
    queryKey: ['change-events', workspaceId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('change_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`change-events-rt-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'change_events',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['change-events', workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  return { changeEvents, isLoading };
}
