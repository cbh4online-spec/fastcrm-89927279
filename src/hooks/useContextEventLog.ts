import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useContextEventLog(typeFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: events, isLoading } = useQuery({
    queryKey: ['context-event-log', workspaceId, typeFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('context_event_log')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  return { events, isLoading };
}
