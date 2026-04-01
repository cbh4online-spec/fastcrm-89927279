import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { CampaignExperiment, CampaignVariant, ExperimentType, EvaluationMetric } from '@/types/marketing';

interface CreateExperimentInput {
  baseCampaignId: string;
  experimentType: ExperimentType;
  evaluationMetric: EvaluationMetric;
  minSampleSize?: number;
  variants: { label: string; trafficSplit: number }[];
}

function mapExperiment(row: any): CampaignExperiment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    baseCampaignId: row.base_campaign_id,
    experimentType: row.experiment_type,
    status: row.status,
    winningVariantId: row.winning_variant_id,
    evaluationMetric: row.evaluation_metric,
    minSampleSize: row.min_sample_size,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVariant(row: any): CampaignVariant {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    campaignId: row.campaign_id,
    variantLabel: row.variant_label,
    trafficSplit: Number(row.traffic_split),
    openRate: Number(row.open_rate),
    clickRate: Number(row.click_rate),
    conversionRate: Number(row.conversion_rate),
    revenueAttributed: Number(row.revenue_attributed),
    sampleSize: row.sample_size,
    createdAt: row.created_at,
  };
}

export function useCampaignExperiments(campaignId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const qk = ['campaign-experiments', campaignId];

  const experimentsQuery = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('campaign_experiments')
        .select('*')
        .eq('base_campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapExperiment);
    },
    enabled: !!campaignId,
  });

  const variantsQuery = useQuery({
    queryKey: ['campaign-variants', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const experimentIds = experimentsQuery.data?.map(e => e.id) || [];
      if (experimentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('campaign_variants')
        .select('*')
        .in('experiment_id', experimentIds)
        .order('variant_label');
      if (error) throw error;
      return (data || []).map(mapVariant);
    },
    enabled: !!campaignId && (experimentsQuery.data?.length ?? 0) > 0,
  });

  const createExperiment = useMutation({
    mutationFn: async (input: CreateExperimentInput) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data: exp, error: expErr } = await supabase
        .from('campaign_experiments')
        .insert({
          workspace_id: currentWorkspace.id,
          base_campaign_id: input.baseCampaignId,
          experiment_type: input.experimentType,
          evaluation_metric: input.evaluationMetric,
          min_sample_size: input.minSampleSize || 100,
        })
        .select()
        .single();
      if (expErr) throw expErr;

      const variantRows = input.variants.map(v => ({
        experiment_id: exp.id,
        variant_label: v.label,
        traffic_split: v.trafficSplit,
      }));
      const { error: varErr } = await supabase.from('campaign_variants').insert(variantRows);
      if (varErr) throw varErr;
      return exp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Experiência criada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar experiência'),
  });

  const declareWinner = useMutation({
    mutationFn: async ({ experimentId, variantId }: { experimentId: string; variantId: string }) => {
      const { error } = await supabase
        .from('campaign_experiments')
        .update({ winning_variant_id: variantId, status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', experimentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Variante vencedora declarada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao declarar vencedora'),
  });

  const deleteExperiment = useMutation({
    mutationFn: async (experimentId: string) => {
      const { error } = await supabase.from('campaign_experiments').delete().eq('id', experimentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Experiência removida');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover'),
  });

  const startExperiment = useMutation({
    mutationFn: async (experimentId: string) => {
      const { error } = await supabase
        .from('campaign_experiments')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', experimentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Experiência iniciada');
    },
  });

  // Auto-detect winner helper
  const getVariantsForExperiment = (experimentId: string) =>
    variantsQuery.data?.filter(v => v.experimentId === experimentId) || [];

  const canAutoWin = (experiment: CampaignExperiment) => {
    const variants = getVariantsForExperiment(experiment.id);
    return variants.length >= 2 && variants.every(v => v.sampleSize >= experiment.minSampleSize);
  };

  const getBestVariant = (experiment: CampaignExperiment): CampaignVariant | null => {
    const variants = getVariantsForExperiment(experiment.id);
    if (variants.length === 0) return null;
    const metric = experiment.evaluationMetric;
    return variants.reduce((best, curr) => {
      const bestVal = best[metric === 'revenue_attributed' ? 'revenueAttributed' : metric === 'open_rate' ? 'openRate' : metric === 'click_rate' ? 'clickRate' : 'conversionRate'];
      const currVal = curr[metric === 'revenue_attributed' ? 'revenueAttributed' : metric === 'open_rate' ? 'openRate' : metric === 'click_rate' ? 'clickRate' : 'conversionRate'];
      return currVal > bestVal ? curr : best;
    }, variants[0]);
  };

  return {
    experiments: experimentsQuery.data || [],
    variants: variantsQuery.data || [],
    isLoading: experimentsQuery.isLoading,
    createExperiment,
    deleteExperiment,
    startExperiment,
    declareWinner,
    getVariantsForExperiment,
    canAutoWin,
    getBestVariant,
  };
}
