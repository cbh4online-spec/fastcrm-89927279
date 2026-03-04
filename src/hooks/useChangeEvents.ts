import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useChangeEvents(limit = 30) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

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

  return { changeEvents, isLoading };
}
