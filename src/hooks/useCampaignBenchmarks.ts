import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { CampaignBenchmark } from '@/types/marketing';

function mapBenchmark(row: any): CampaignBenchmark {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    periodDays: row.period_days,
    metrics: row.metrics || {},
    calculatedAt: row.calculated_at,
  };
}

export function useCampaignBenchmarks(periodDays = 30) {
  const { currentWorkspace } = useWorkspace();

  // Compute benchmarks from live campaign data
  const benchmarksQuery = useQuery({
    queryKey: ['campaign-benchmarks', currentWorkspace?.id, periodDays],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const cutoff = new Date(Date.now() - periodDays * 86400000).toISOString();

      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, name, template_id, segment_id, status, sent_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, unsubscribed_count, send_hour, completed_at')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'sent')
        .gte('completed_at', cutoff)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (!campaigns || campaigns.length === 0) return null;

      // Overall workspace benchmark
      const totals = campaigns.reduce(
        (acc, c) => {
          const d = c.delivered_count || 1;
          acc.openRates.push(d > 0 ? (c.opened_count / d) * 100 : 0);
          acc.clickRates.push(d > 0 ? (c.clicked_count / d) * 100 : 0);
          acc.bounceRates.push(c.sent_count > 0 ? (c.bounced_count / c.sent_count) * 100 : 0);
          return acc;
        },
        { openRates: [] as number[], clickRates: [] as number[], bounceRates: [] as number[] }
      );

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const workspaceBenchmark = {
        avgOpenRate: avg(totals.openRates),
        avgClickRate: avg(totals.clickRates),
        avgBounceRate: avg(totals.bounceRates),
        totalCampaigns: campaigns.length,
      };

      // Best/worst campaigns
      const scored = campaigns.map(c => {
        const d = c.delivered_count || 1;
        return {
          ...c,
          openRate: d > 0 ? (c.opened_count / d) * 100 : 0,
          clickRate: d > 0 ? (c.clicked_count / d) * 100 : 0,
        };
      });

      scored.sort((a, b) => b.openRate - a.openRate);
      const topCampaigns = scored.slice(0, 5);
      const worstCampaigns = [...scored].sort((a, b) => a.openRate - b.openRate).slice(0, 5);

      // Best send hours
      const hourBuckets: Record<number, { opens: number; delivered: number }> = {};
      campaigns.forEach(c => {
        if (c.send_hour != null) {
          if (!hourBuckets[c.send_hour]) hourBuckets[c.send_hour] = { opens: 0, delivered: 0 };
          hourBuckets[c.send_hour].opens += c.opened_count;
          hourBuckets[c.send_hour].delivered += c.delivered_count;
        }
      });
      const bestHours = Object.entries(hourBuckets)
        .map(([h, v]) => ({ hour: Number(h), openRate: v.delivered > 0 ? (v.opens / v.delivered) * 100 : 0 }))
        .sort((a, b) => b.openRate - a.openRate)
        .slice(0, 3);

      return {
        workspace: workspaceBenchmark,
        topCampaigns,
        worstCampaigns,
        bestHours,
        periodDays,
      };
    },
    enabled: !!currentWorkspace?.id,
  });

  return {
    benchmarks: benchmarksQuery.data,
    isLoading: benchmarksQuery.isLoading,
  };
}
