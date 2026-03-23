import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { DealIntelligenceReport } from '@/types/ai-sales-coach';

export function useDealIntelligenceReport(opportunityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['deal-intel-report', opportunityId],
    queryFn: async (): Promise<DealIntelligenceReport | null> => {
      const { data } = await (supabase as any)
        .from('deal_intelligence_reports')
        .select('*')
        .eq('opportunity_id', opportunityId!)
        .eq('is_stale', false)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as DealIntelligenceReport) ?? null;
    },
    enabled: !!opportunityId && !!currentWorkspace?.id,
    staleTime: 30_000,
  });
}

export function useGenerateDealIntelligenceReport() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      opportunityId,
      forceRefresh = false,
    }: {
      opportunityId: string;
      forceRefresh?: boolean;
    }): Promise<DealIntelligenceReport> => {
      const { data, error } = await supabase.functions.invoke('deal-intelligence-ai', {
        body: {
          opportunity_id: opportunityId,
          workspace_id: currentWorkspace!.id,
          force_refresh: forceRefresh,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.report as DealIntelligenceReport;
    },
    onSuccess: (_, { opportunityId }) => {
      qc.invalidateQueries({ queryKey: ['deal-intel-report', opportunityId] });
      qc.invalidateQueries({ queryKey: ['pipeline-risk-report'] });
      toast.success('Análise do deal concluída');
    },
    onError: (e: Error) => toast.error('Erro na análise: ' + e.message),
  });
}

export function useAllDealReports() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['all-deal-intel-reports', currentWorkspace?.id],
    queryFn: async (): Promise<DealIntelligenceReport[]> => {
      const { data } = await (supabase as any)
        .from('deal_intelligence_reports')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_stale', false)
        .order('health_score', { ascending: true })
        .limit(100);
      return (data ?? []) as DealIntelligenceReport[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}
