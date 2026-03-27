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
  priority?: string | null;
  created_at: string;
  due_at?: string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  related_name?: string | null;
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

      // 3. Pending tasks — with assigned user name
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_at, created_at, assigned_to, related_id, related_type')
        .eq('workspace_id', wsId)
        .in('status', ['pending', 'in_progress', 'open'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(30);

      // Resolve assigned user names
      const assigneeIds = [...new Set(tasks?.map(t => t.assigned_to).filter(Boolean) as string[])];
      let profileMap: Record<string, string> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', assigneeIds);
        profiles?.forEach(p => { profileMap[p.user_id] = p.full_name || 'Sem nome'; });
      }

      // Resolve related entity names (contacts, companies, leads)
      const relatedGroups: Record<string, string[]> = {};
      tasks?.forEach(t => {
        if (t.related_id && t.related_type) {
          if (!relatedGroups[t.related_type]) relatedGroups[t.related_type] = [];
          if (!relatedGroups[t.related_type].includes(t.related_id)) {
            relatedGroups[t.related_type].push(t.related_id);
          }
        }
      });

      const relatedNameMap: Record<string, string> = {};
      const tableNameField: Record<string, { table: string; field: string }> = {
        contact: { table: 'contacts', field: 'name' },
        company: { table: 'companies', field: 'name' },
        lead: { table: 'leads', field: 'name' },
        opportunity: { table: 'opportunities', field: 'title' },
      };

      await Promise.all(
        Object.entries(relatedGroups).map(async ([type, ids]) => {
          const cfg = tableNameField[type];
          if (!cfg || ids.length === 0) return;
          const { data } = await supabase
            .from(cfg.table as any)
            .select(`id, ${cfg.field}`)
            .in('id', ids);
          data?.forEach((d: any) => { relatedNameMap[d.id] = d[cfg.field] || type; });
        })
      );

      // Build action URL for tasks based on related_type
      const taskActionUrl = (t: { related_type: string; related_id: string }) => {
        const routes: Record<string, string> = {
          contact: `/dashboard/contacts/${t.related_id}`,
          company: `/dashboard/companies/${t.related_id}`,
          lead: `/dashboard/leads/${t.related_id}`,
          opportunity: `/dashboard/opportunities/${t.related_id}`,
        };
        return routes[t.related_type] || `/dashboard/tasks`;
      };

      tasks?.forEach(t => {
        const isOverdue = t.due_at && new Date(t.due_at) < new Date();
        items.push({
          id: t.id,
          category: 'task',
          title: t.title,
          message: t.description,
          severity: isOverdue ? 'critical' : t.priority === 'high' ? 'warning' : 'info',
          status: t.status,
          priority: t.priority,
          created_at: t.created_at,
          due_at: t.due_at,
          assigned_to: t.assigned_to,
          assigned_name: t.assigned_to ? profileMap[t.assigned_to] || null : null,
          related_type: t.related_type,
          related_id: t.related_id,
          related_name: t.related_id ? relatedNameMap[t.related_id] || null : null,
          source_table: 'tasks',
          actionUrl: t.related_id && t.related_type ? taskActionUrl(t as any) : '/dashboard/tasks',
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
        .select('id, title, value, status, updated_at, created_at')
        .eq('workspace_id', wsId)
        .not('status', 'in', '("won","lost")')
        .lt('updated_at', fiveDaysAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(10);

      stalledDeals?.forEach(d => {
        const daysStalled = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000);
        items.push({
          id: d.id,
          category: 'deal',
          title: `${d.title} — ${d.value ? d.value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '€0'}`,
          message: `Parado há ${daysStalled} dias (status: "${d.status}")`,
          severity: daysStalled > 10 ? 'critical' : 'warning',
          status: 'stalled',
          created_at: d.updated_at,
          source_table: 'opportunities',
          actionUrl: `/dashboard/opportunities`,
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
