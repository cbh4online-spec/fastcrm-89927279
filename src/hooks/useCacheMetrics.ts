import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  invalidatedEntries: number;
  totalHits: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;
  avgHitLatencyMs: number;
}

export interface CacheStatsByAgent {
  agentType: string;
  entries: number;
  hits: number;
  tokensSaved: number;
  hitRatio: number;
}

export interface CacheMetricsPeriod {
  periodStart: string;
  periodEnd: string;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  tokensSaved: number;
}

const COST_PER_1K_TOKENS = 0.002; // Estimated cost per 1K tokens

export function useCacheMetrics() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  // Fetch overall cache statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['cache-stats', workspaceId],
    queryFn: async (): Promise<CacheStats> => {
      if (!workspaceId) throw new Error('No workspace');

      const now = new Date().toISOString();

      // Get all cache entries
      const { data: entries, error } = await supabase
        .from('ai_agent_response_cache')
        .select('id, hit_count, tokens_saved, original_duration_ms, expires_at, invalidated_at')
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      const validEntries = entries?.filter(e => 
        !e.invalidated_at && new Date(e.expires_at) > new Date(now)
      ).length || 0;

      const expiredEntries = entries?.filter(e => 
        !e.invalidated_at && new Date(e.expires_at) <= new Date(now)
      ).length || 0;

      const invalidatedEntries = entries?.filter(e => e.invalidated_at).length || 0;

      const totalHits = entries?.reduce((sum, e) => sum + (e.hit_count || 0), 0) || 0;
      const totalTokensSaved = entries?.reduce((sum, e) => sum + (e.tokens_saved || 0), 0) || 0;
      const estimatedCostSaved = (totalTokensSaved / 1000) * COST_PER_1K_TOKENS;

      const entriesWithLatency = entries?.filter(e => e.original_duration_ms) || [];
      const avgHitLatencyMs = entriesWithLatency.length > 0
        ? entriesWithLatency.reduce((sum, e) => sum + (e.original_duration_ms || 0), 0) / entriesWithLatency.length
        : 0;

      return {
        totalEntries: entries?.length || 0,
        validEntries,
        expiredEntries,
        invalidatedEntries,
        totalHits,
        totalTokensSaved,
        estimatedCostSaved,
        avgHitLatencyMs,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch stats by agent type
  const { data: statsByAgent, isLoading: agentStatsLoading } = useQuery({
    queryKey: ['cache-stats-by-agent', workspaceId],
    queryFn: async (): Promise<CacheStatsByAgent[]> => {
      if (!workspaceId) throw new Error('No workspace');

      const { data: entries, error } = await supabase
        .from('ai_agent_response_cache')
        .select('agent_type, hit_count, tokens_saved')
        .eq('workspace_id', workspaceId)
        .is('invalidated_at', null);

      if (error) throw error;

      // Get metrics for hit ratio calculation
      const { data: metrics } = await supabase
        .from('ai_cache_metrics')
        .select('agent_type, cache_hits, cache_misses, tokens_saved')
        .eq('workspace_id', workspaceId);

      // Group by agent type
      const agentMap = new Map<string, { entries: number; hits: number; tokensSaved: number }>();

      entries?.forEach(entry => {
        const existing = agentMap.get(entry.agent_type) || { entries: 0, hits: 0, tokensSaved: 0 };
        agentMap.set(entry.agent_type, {
          entries: existing.entries + 1,
          hits: existing.hits + (entry.hit_count || 0),
          tokensSaved: existing.tokensSaved + (entry.tokens_saved || 0),
        });
      });

      // Calculate hit ratios from metrics
      const metricsMap = new Map<string, { hits: number; misses: number }>();
      metrics?.forEach(m => {
        const existing = metricsMap.get(m.agent_type) || { hits: 0, misses: 0 };
        metricsMap.set(m.agent_type, {
          hits: existing.hits + (m.cache_hits || 0),
          misses: existing.misses + (m.cache_misses || 0),
        });
      });

      return Array.from(agentMap.entries()).map(([agentType, data]) => {
        const metricData = metricsMap.get(agentType);
        const totalRequests = metricData ? metricData.hits + metricData.misses : data.hits;
        const hitRatio = totalRequests > 0 ? (metricData?.hits || data.hits) / totalRequests : 0;

        return {
          agentType,
          entries: data.entries,
          hits: data.hits,
          tokensSaved: data.tokensSaved,
          hitRatio,
        };
      });
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

  // Fetch metrics over time (last 7 days)
  const { data: metricsOverTime, isLoading: metricsLoading } = useQuery({
    queryKey: ['cache-metrics-time', workspaceId],
    queryFn: async (): Promise<CacheMetricsPeriod[]> => {
      if (!workspaceId) throw new Error('No workspace');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: metrics, error } = await supabase
        .from('ai_cache_metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('period_start', sevenDaysAgo.toISOString())
        .order('period_start', { ascending: true });

      if (error) throw error;

      return (metrics || []).map(m => ({
        periodStart: m.period_start,
        periodEnd: m.period_end,
        cacheHits: m.cache_hits || 0,
        cacheMisses: m.cache_misses || 0,
        hitRatio: (m.cache_hits || 0) + (m.cache_misses || 0) > 0
          ? (m.cache_hits || 0) / ((m.cache_hits || 0) + (m.cache_misses || 0))
          : 0,
        tokensSaved: m.tokens_saved || 0,
      }));
    },
    enabled: !!workspaceId,
    refetchInterval: 60000,
  });

  return {
    stats,
    statsByAgent,
    metricsOverTime,
    isLoading: statsLoading || agentStatsLoading || metricsLoading,
  };
}
