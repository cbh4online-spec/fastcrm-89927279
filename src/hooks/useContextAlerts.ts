import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useContextAlerts() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['context-alerts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('context_alerts')
        .select('*, context_blocks(title, block_type)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const unreadCount = alerts?.filter((a) => a.status === 'unread').length ?? 0;

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('context_alerts')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['context-alerts', workspaceId] }),
  });

  const resolve = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('context_alerts')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['context-alerts', workspaceId] }),
  });

  const snooze = useMutation({
    mutationFn: async ({ alertId, hours }: { alertId: string; hours: number }) => {
      const snoozeUntil = new Date(Date.now() + hours * 3600000).toISOString();
      const { error } = await supabase
        .from('context_alerts')
        .update({ snooze_until: snoozeUntil, status: 'read', updated_at: new Date().toISOString() } as any)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['context-alerts', workspaceId] }),
  });

  return { alerts, isLoading, unreadCount, markRead, resolve, snooze };
}
