import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type {
  PipelineRiskReport,
  MultiPipelineIntelReport,
  SalesCoachOverview,
} from '@/types/ai-sales-coach';

export function usePipelineRisk(pipelineId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['pipeline-risk-report', currentWorkspace?.id, pipelineId ?? 'all'],
    queryFn: async (): Promise<PipelineRiskReport | null> => {
      let query = (supabase as any)
        .from('pipeline_risk_reports')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_stale', false)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1);

      if (pipelineId) query = query.eq('pipeline_id', pipelineId);
      else query = query.is('pipeline_id', null);

      const { data } = await query.maybeSingle();
      return (data as PipelineRiskReport) ?? null;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}

export function useGeneratePipelineRisk() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (pipelineId?: string) => {
      const { data, error } = await supabase.functions.invoke('ai-pipeline-risk', {
        body: { workspace_id: currentWorkspace!.id, pipeline_id: pipelineId, force_refresh: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.report as PipelineRiskReport;
    },
    onSuccess: (_, pipelineId) => {
      qc.invalidateQueries({ queryKey: ['pipeline-risk-report', currentWorkspace?.id, pipelineId ?? 'all'] });
      toast.success('Análise de risco do pipeline concluída');
    },
    onError: (e: Error) => toast.error('Erro na análise: ' + e.message),
  });
}

export function useMultiPipelineIntel() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['multi-pipeline-intel-report', currentWorkspace?.id],
    queryFn: async (): Promise<MultiPipelineIntelReport | null> => {
      const { data } = await (supabase as any)
        .from('multi_pipeline_intel_reports')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_stale', false)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as MultiPipelineIntelReport) ?? null;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}

export function useGenerateMultiPipelineIntel() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('multi-pipeline-intelligence', {
        body: { workspace_id: currentWorkspace!.id, force_refresh: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.report as MultiPipelineIntelReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['multi-pipeline-intel-report', currentWorkspace?.id] });
      toast.success('Análise multi-pipeline concluída');
    },
    onError: (e: Error) => toast.error('Erro na análise: ' + e.message),
  });
}

export function useSalesCoachOverview(): { data: SalesCoachOverview | null; isLoading: boolean } {
  const { data: riskReport, isLoading: riskLoading } = usePipelineRisk();

  const overview: SalesCoachOverview | null = riskReport
    ? {
        pipeline_health_score: riskReport.pipeline_health_score,
        total_at_risk_value: Number(riskReport.at_risk_value),
        critical_deals_count: riskReport.critical_count,
        stalled_deals_count: riskReport.risk_breakdown?.stalled ?? 0,
        top_priority_action: riskReport.top_3_priorities?.[0] ?? 'Analisar pipeline',
        win_rate_trend: 'stable',
        deals_analyzed: riskReport.deal_risks?.length ?? 0,
        last_analysis: riskReport.generated_at,
      }
    : null;

  return { data: overview, isLoading: riskLoading };
}
