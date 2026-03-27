import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface UnifiedItem {
  id: string;
  category: 'alert' | 'notification' | 'task' | 'followup' | 'deal';
  title: string;
  message: string | null;
  severity: 'critical' | 'warning' | 'info' | 'success';
  status: string;
  created_at: string;
  due_at?: string | null;
  metadata?: Record<string, unknown>;
  source_table: string;
  actionUrl?: string;
}

export function useProductivityHub() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['productivity-hub', wsId],
    queryFn: async (): Promise<UnifiedItem[]> => {
      if (!wsId) return [];
      const items: UnifiedItem[] = [];

      // 1. Context alerts (unread/read)
      const { data: ctxAlerts } = await supabase
        .from('context_alerts')
        .select('id, title, message, severity, status, created_at')
        .eq('workspace_id', wsId)
        .in('status', ['unread', 'read'])
        .order('created_at', { ascending: false })
        .limit(20);

      ctxAlerts?.forEach(a => items.push({
        id: a.id,
        category: 'alert',
        title: a.title,
        message: a.message,
        severity: a.severity === 'critical' ? 'critical' : a.severity === 'risk' ? 'warning' : a.severity === 'warn' ? 'warning' : 'info',
        status: a.status,
        created_at: a.created_at,
        source_table: 'context_alerts',
      }));

      // 2. Admin notifications (unread)
      const { data: adminNotifs } = await supabase
        .from('admin_notifications')
        .select('id, title, message, type, is_read, created_at, metadata')
        .eq('workspace_id', wsId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      adminNotifs?.forEach(n => items.push({
        id: n.id,
        category: 'notification',
        title: n.title,
        message: n.message,
        severity: n.type?.includes('error') || n.type?.includes('fail') ? 'critical' : 'info',
        status: n.is_read ? 'read' : 'unread',
        created_at: n.created_at,
        metadata: n.metadata as Record<string, unknown>,
        source_table: 'admin_notifications',
      }));

      // 3. Pending tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_at, created_at')
        .eq('workspace_id', wsId)
        .in('status', ['pending', 'in_progress', 'open'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(20);

      tasks?.forEach(t => {
        const isOverdue = t.due_at && new Date(t.due_at) < new Date();
        items.push({
          id: t.id,
          category: 'task',
          title: t.title,
          message: t.description,
          severity: isOverdue ? 'critical' : t.priority === 'high' ? 'warning' : 'info',
          status: t.status,
          created_at: t.created_at,
          due_at: t.due_at,
          source_table: 'tasks',
        });
      });

      // 4. Pending followups
      const { data: followups } = await supabase
        .from('conversation_followups')
        .select('id, prepared_message, status, suggested_at, hours_since_last_reply, created_at')
        .eq('workspace_id', wsId)
        .eq('status', 'pending')
        .order('suggested_at', { ascending: false })
        .limit(15);

      followups?.forEach(f => items.push({
        id: f.id,
        category: 'followup',
        title: `Follow-up pendente (${f.hours_since_last_reply}h sem resposta)`,
        message: f.prepared_message?.substring(0, 120) || null,
        severity: f.hours_since_last_reply > 48 ? 'critical' : f.hours_since_last_reply > 24 ? 'warning' : 'info',
        status: f.status,
        created_at: f.created_at,
        source_table: 'conversation_followups',
      }));

      // 5. Stalled deals (>5 days no update)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const { data: stalledDeals } = await supabase
        .from('opportunities')
        .select('id, title, value, stage, updated_at, created_at')
        .eq('workspace_id', wsId)
        .not('stage', 'in', '("won","lost")')
        .lt('updated_at', fiveDaysAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(10);

      stalledDeals?.forEach(d => {
        const daysStalled = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000);
        items.push({
          id: d.id,
          category: 'deal',
          title: `${d.title} — ${d.value ? d.value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '€0'}`,
          message: `Parado há ${daysStalled} dias na fase "${d.stage}"`,
          severity: daysStalled > 10 ? 'critical' : 'warning',
          status: 'stalled',
          created_at: d.updated_at,
          source_table: 'opportunities',
          actionUrl: `/dashboard/pipeline`,
        });
      });

      // 6. Account Brief change alerts (unread)
      const { data: briefAlerts } = await supabase
        .from('account_brief_change_alerts')
        .select('id, title, summary, severity, is_read, created_at')
        .eq('workspace_id', wsId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      briefAlerts?.forEach(b => items.push({
        id: b.id,
        category: 'alert',
        title: b.title,
        message: b.summary,
        severity: b.severity === 'critical' ? 'critical' : b.severity === 'high' ? 'warning' : 'info',
        status: 'unread',
        created_at: b.created_at,
        source_table: 'account_brief_change_alerts',
        actionUrl: '/dashboard/account-brief',
      }));

      // Sort: critical first, then by date
      items.sort((a, b) => {
        const sevOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        const diff = sevOrder[a.severity] - sevOrder[b.severity];
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return items;
    },
    enabled: !!wsId,
    refetchInterval: 60_000,
  });
}
