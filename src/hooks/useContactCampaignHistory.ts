import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactCampaignInteraction {
  campaignId: string;
  campaignName: string;
  campaignSubject: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  events: Array<{
    eventType: string;
    occurredAt: string;
    linkUrl?: string;
  }>;
}

export function useContactCampaignHistory(contactId?: string, leadId?: string) {
  return useQuery({
    queryKey: ['contact-campaign-history', contactId, leadId],
    queryFn: async () => {
      if (!contactId && !leadId) return [];

      // Get recipients for this contact/lead
      let query = supabase
        .from('marketing_recipients')
        .select('id, campaign_id, status, sent_at, delivered_at, opened_at, clicked_at, bounced_at, email');

      if (contactId) {
        query = query.eq('contact_id', contactId);
      } else if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data: recipients, error: recError } = await query.order('created_at', { ascending: false });
      if (recError) throw recError;
      if (!recipients?.length) return [];

      // Get campaign names
      const campaignIds = [...new Set(recipients.map(r => r.campaign_id))];
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, name, subject')
        .in('id', campaignIds);

      const campaignMap = new Map((campaigns || []).map(c => [c.id, c]));

      // Get events for this contact/lead
      const recipientIds = recipients.map(r => r.id);
      const { data: events } = await supabase
        .from('marketing_events')
        .select('campaign_id, event_type, occurred_at, link_url, recipient_id')
        .in('recipient_id', recipientIds)
        .order('occurred_at', { ascending: true });

      // Group events by campaign
      const eventsByCampaign = new Map<string, typeof events>();
      (events || []).forEach(e => {
        const existing = eventsByCampaign.get(e.campaign_id) || [];
        existing.push(e);
        eventsByCampaign.set(e.campaign_id, existing);
      });

      // Build interactions
      const interactions: ContactCampaignInteraction[] = recipients.map(r => {
        const campaign = campaignMap.get(r.campaign_id);
        const campaignEvents = eventsByCampaign.get(r.campaign_id) || [];

        return {
          campaignId: r.campaign_id,
          campaignName: campaign?.name || 'Campanha',
          campaignSubject: campaign?.subject || '',
          status: r.status,
          sentAt: r.sent_at,
          deliveredAt: r.delivered_at,
          openedAt: r.opened_at,
          clickedAt: r.clicked_at,
          bouncedAt: r.bounced_at,
          events: campaignEvents.map(e => ({
            eventType: e.event_type,
            occurredAt: e.occurred_at,
            linkUrl: e.link_url,
          })),
        };
      });

      return interactions;
    },
    enabled: !!(contactId || leadId),
  });
}

export function getEngagementBadge(interactions: ContactCampaignInteraction[]): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
} {
  if (!interactions.length) return { label: 'Sem dados', variant: 'outline', color: 'text-muted-foreground' };

  const hasBounce = interactions.some(i => i.status === 'bounced');
  if (hasBounce) return { label: 'Bounce', variant: 'destructive', color: 'text-destructive' };

  const hasComplaint = interactions.some(i => i.status === 'complained');
  if (hasComplaint) return { label: 'Complaint', variant: 'destructive', color: 'text-destructive' };

  const hasClick = interactions.some(i => i.clickedAt);
  if (hasClick) return { label: 'Ativo', variant: 'default', color: 'text-green-600' };

  const hasOpen = interactions.some(i => i.openedAt);
  if (hasOpen) return { label: 'Passivo', variant: 'secondary', color: 'text-amber-600' };

  return { label: 'Inativo', variant: 'outline', color: 'text-muted-foreground' };
}
