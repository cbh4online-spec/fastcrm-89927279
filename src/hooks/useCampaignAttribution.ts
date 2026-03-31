import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { CampaignCommercialImpact } from '@/types/marketing';

export function useCampaignAttribution(campaignId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['campaign-attribution', currentWorkspace?.id, campaignId],
    queryFn: async (): Promise<CampaignCommercialImpact> => {
      if (!currentWorkspace?.id) return defaultImpact();

      let query = (supabase as any)
        .from('campaign_attribution')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as Array<{
        attribution_type: string;
        revenue_attributed: number;
        revenue_influenced: number;
        opportunity_id: string | null;
        lead_id: string | null;
        contact_id: string | null;
      }>;

      const originated = rows.filter(r => r.attribution_type === 'originated');
      const influenced = rows.filter(r => r.attribution_type === 'influenced');

      const uniqueOpps = new Set(rows.filter(r => r.opportunity_id).map(r => r.opportunity_id));
      const originatedOpps = new Set(originated.filter(r => r.opportunity_id).map(r => r.opportunity_id));
      const leadsGenerated = new Set(rows.filter(r => r.lead_id).map(r => r.lead_id));

      const revenueAttributed = rows.reduce((s, r) => s + (r.revenue_attributed || 0), 0);
      const revenueInfluenced = rows.reduce((s, r) => s + (r.revenue_influenced || 0), 0);

      return {
        leadsGenerated: leadsGenerated.size,
        opportunitiesInfluenced: uniqueOpps.size,
        opportunitiesOriginated: originatedOpps.size,
        revenueAttributed: Math.round(revenueAttributed),
        revenueInfluenced: Math.round(revenueInfluenced),
        roi: undefined,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAllCampaignAttributions() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['all-campaign-attributions', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await (supabase as any)
        .from('campaign_attribution')
        .select('campaign_id, attribution_model, attribution_type, revenue_attributed, revenue_influenced, opportunity_id')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      // Group by campaign
      const byCampaign = new Map<string, { attributed: number; influenced: number; opps: Set<string> }>();

      ((data || []) as Array<any>).forEach((row: any) => {
        const existing = byCampaign.get(row.campaign_id) || { attributed: 0, influenced: 0, opps: new Set<string>() };
        existing.attributed += row.revenue_attributed || 0;
        existing.influenced += row.revenue_influenced || 0;
        if (row.opportunity_id) existing.opps.add(row.opportunity_id);
        byCampaign.set(row.campaign_id, existing);
      });

      return Array.from(byCampaign.entries()).map(([campaignId, data]) => ({
        campaignId,
        revenueAttributed: Math.round(data.attributed),
        revenueInfluenced: Math.round(data.influenced),
        opportunitiesCount: data.opps.size,
      }));
    },
    enabled: !!currentWorkspace?.id,
  });
}

function defaultImpact(): CampaignCommercialImpact {
  return {
    leadsGenerated: 0,
    opportunitiesInfluenced: 0,
    opportunitiesOriginated: 0,
    revenueAttributed: 0,
    revenueInfluenced: 0,
  };
}
