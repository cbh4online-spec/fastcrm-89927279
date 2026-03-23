import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { IMOMarketInsight, IMOGrowthInsight } from '@/types/imo-ai'

export function useMarketInsight() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['imo-market-insight', workspaceId],
    queryFn: async (): Promise<IMOMarketInsight | null> => {
      const { data } = await supabase
        .from('imo_market_insights')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('is_stale', false)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (data as unknown as IMOMarketInsight) ?? null
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  })
}

export function useGrowthInsight() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['imo-growth-insight', workspaceId],
    queryFn: async (): Promise<IMOGrowthInsight | null> => {
      const { data } = await supabase
        .from('imo_growth_insights')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('is_stale', false)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (data as unknown as IMOGrowthInsight) ?? null
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  })
}

export function useGenerateIMOAnalysis() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useMutation({
    mutationFn: async ({
      analysisType = 'both',
      forceRefresh = false,
      periodDays = 90,
    }: {
      analysisType?: 'market' | 'growth' | 'both'
      forceRefresh?: boolean
      periodDays?: number
    } = {}) => {
      const { data, error } = await supabase.functions.invoke('ai-growth-insights', {
        body: {
          workspace_id: workspaceId,
          analysis_type: analysisType,
          force_refresh: forceRefresh,
          period_days: periodDays,
        },
      })
      if (error) throw error
      return data as { market?: IMOMarketInsight; growth?: IMOGrowthInsight }
    },
    onSuccess: (_, vars) => {
      const type = vars?.analysisType ?? 'both'
      if (type === 'market' || type === 'both') {
        qc.invalidateQueries({ queryKey: ['imo-market-insight', workspaceId] })
      }
      if (type === 'growth' || type === 'both') {
        qc.invalidateQueries({ queryKey: ['imo-growth-insight', workspaceId] })
      }
    },
  })
}

export function useGrowthScoreHistory(limit = 12) {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['imo-growth-score-history', workspaceId, limit],
    queryFn: async (): Promise<Array<{ generated_at: string; growth_score: number }>> => {
      const { data } = await supabase
        .from('imo_growth_insights')
        .select('generated_at, growth_score')
        .eq('workspace_id', workspaceId!)
        .order('generated_at', { ascending: true })
        .limit(limit)
      return (data as unknown as Array<{ generated_at: string; growth_score: number }>) ?? []
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  })
}

export function useIMOAI() {
  const market = useMarketInsight()
  const growth = useGrowthInsight()
  const generate = useGenerateIMOAnalysis()

  return {
    marketInsight: market.data,
    growthInsight: growth.data,
    isLoadingMarket: market.isLoading,
    isLoadingGrowth: growth.isLoading,
    isGenerating: generate.isPending,
    refetchAll: () => {
      market.refetch()
      growth.refetch()
    },
    generateAnalysis: generate.mutate,
    generateAsync: generate.mutateAsync,
    lastUpdated: market.data?.generated_at ?? growth.data?.generated_at ?? null,
  }
}
