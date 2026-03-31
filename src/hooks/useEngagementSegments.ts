import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface EngagementSegment {
  id: string;
  label: string;
  description: string;
  count: number;
  icon: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
}

export function useEngagementSegments() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['engagement-segments', currentWorkspace?.id],
    queryFn: async (): Promise<EngagementSegment[]> => {
      if (!currentWorkspace?.id) return [];

      // Get all recipients with status data from last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: recipients, error } = await supabase
        .from('marketing_recipients')
        .select('id, email, status, opened_at, clicked_at, bounced_at, sent_at, contact_id, lead_id')
        .eq('workspace_id', currentWorkspace.id)
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (error) throw error;
      if (!recipients?.length) return [];

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

      // Deduplicate by email, keep latest
      const byEmail = new Map<string, typeof recipients[0]>();
      recipients.forEach(r => {
        const existing = byEmail.get(r.email);
        if (!existing || new Date(r.sent_at || '') > new Date(existing.sent_at || '')) {
          byEmail.set(r.email, r);
        }
      });

      const uniqueRecipients = Array.from(byEmail.values());

      // Calculate segments
      const engaged7d = uniqueRecipients.filter(r => r.opened_at && new Date(r.opened_at) >= sevenDaysAgo).length;
      const engaged30d = uniqueRecipients.filter(r => r.opened_at && new Date(r.opened_at) >= thirtyDaysAgo).length;
      const neverOpened = uniqueRecipients.filter(r => !r.opened_at && r.status !== 'bounced').length;
      const openedNotClicked = uniqueRecipients.filter(r => r.opened_at && !r.clicked_at).length;
      const multiClicker = recipients.filter(r => r.clicked_at).length; // count all clicks, not unique
      const bounced = uniqueRecipients.filter(r => r.status === 'bounced').length;
      const complained = uniqueRecipients.filter(r => r.status === 'complained').length;
      const unsubscribed = uniqueRecipients.filter(r => r.status === 'unsubscribed').length;
      const cold90d = uniqueRecipients.filter(r => {
        if (!r.sent_at) return false;
        const sentDate = new Date(r.sent_at);
        return sentDate < ninetyDaysAgo && !r.opened_at;
      }).length;

      const segments: EngagementSegment[] = [
        { id: 'engaged_7d', label: 'Engajados 7d', description: 'Abriram nos últimos 7 dias', count: engaged7d, icon: 'zap', severity: 'success' },
        { id: 'engaged_30d', label: 'Engajados 30d', description: 'Abriram nos últimos 30 dias', count: engaged30d, icon: 'activity', severity: 'success' },
        { id: 'never_opened', label: 'Nunca abriu', description: 'Receberam mas nunca abriram', count: neverOpened, icon: 'eye-off', severity: 'warning' },
        { id: 'opened_not_clicked', label: 'Abriu sem clicar', description: 'Abriram mas não clicaram', count: openedNotClicked, icon: 'eye', severity: 'info' },
        { id: 'bounced', label: 'Bounced', description: 'Emails devolvidos', count: bounced, icon: 'alert-triangle', severity: 'danger' },
        { id: 'complained', label: 'Complaint', description: 'Marcaram como spam', count: complained, icon: 'shield-alert', severity: 'danger' },
        { id: 'unsubscribed', label: 'Cancelaram', description: 'Cancelaram subscrição', count: unsubscribed, icon: 'user-minus', severity: 'warning' },
        { id: 'cold_90d', label: 'Frios 90d+', description: 'Sem abertura há mais de 90 dias', count: cold90d, icon: 'snowflake', severity: 'warning' },
      ];
      return segments.filter(s => s.count > 0 || ['engaged_7d', 'engaged_30d', 'never_opened'].includes(s.id));
    },
    enabled: !!currentWorkspace?.id,
  });
}
