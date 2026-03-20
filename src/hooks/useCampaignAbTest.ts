import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface CampaignAbTest {
  id: string;
  campaign_id: string;
  workspace_id: string;
  variant_a_subject: string;
  variant_b_subject: string;
  test_percentage: number;
  wait_hours: number;
  winner_metric: 'open_rate' | 'click_rate';
  winner_variant: 'a' | 'b' | null;
  status: 'pending' | 'testing' | 'completed';
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_opens: number;
  variant_b_opens: number;
  variant_a_clicks: number;
  variant_b_clicks: number;
  test_started_at: string | null;
  winner_selected_at: string | null;
  created_at: string;
}

interface AbTestConfig {
  variant_a_subject: string;
  variant_b_subject: string;
  test_percentage?: number;
  wait_hours?: number;
  winner_metric?: string;
}

export function useCampaignAbTest(campaignId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const abTestQuery = useQuery({
    queryKey: ['campaign-ab-test', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaign_ab_tests')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CampaignAbTest | null;
    },
    enabled: !!campaignId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || (data as CampaignAbTest | null)?.status !== 'testing') return false;
      return 30000;
    },
  });

  const createAbTest = useMutation({
    mutationFn: async (config: AbTestConfig) => {
      if (!campaignId || !currentWorkspace?.id) throw new Error('Missing data');
      const { data, error } = await supabase.from('campaign_ab_tests').insert({
        campaign_id: campaignId,
        workspace_id: currentWorkspace.id,
        ...config,
      }).select().single();
      if (error) throw error;

      await supabase.from('marketing_campaigns').update({ ab_test_id: data.id }).eq('id', campaignId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-test', campaignId] });
      toast.success('Teste A/B configurado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar teste A/B'),
  });

  const deleteAbTest = useMutation({
    mutationFn: async () => {
      const test = abTestQuery.data;
      if (!test) return;
      await supabase.from('marketing_campaigns').update({ ab_test_id: null }).eq('id', campaignId!);
      const { error } = await supabase.from('campaign_ab_tests').delete().eq('id', test.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-test', campaignId] });
      toast.success('Teste A/B removido');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover teste A/B'),
  });

  const getAbTestResults = useMutation({
    mutationFn: async () => {
      const test = abTestQuery.data;
      if (!test) throw new Error('No A/B test');
      const { data, error } = await supabase.functions.invoke('email-ab-selector', {
        body: { ab_test_id: test.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-test', campaignId] });
      toast.success('Resultados do teste A/B atualizados');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao obter resultados'),
  });

  const test = abTestQuery.data;
  const isCompleted = test?.status === 'completed';
  const winner = test?.winner_variant;

  const openRateA = test && (test.variant_a_sent ?? 0) > 0
    ? ((test.variant_a_opens / test.variant_a_sent) * 100).toFixed(1)
    : null;
  const openRateB = test && (test.variant_b_sent ?? 0) > 0
    ? ((test.variant_b_opens / test.variant_b_sent) * 100).toFixed(1)
    : null;

  const timeRemaining = test?.test_started_at && test.status === 'testing'
    ? Math.max(
        0,
        (test.wait_hours ?? 4) * 60 * 60 * 1000 -
          (Date.now() - new Date(test.test_started_at).getTime())
      )
    : null;

  return {
    abTest: test,
    isLoading: abTestQuery.isLoading,
    createAbTest,
    deleteAbTest,
    getAbTestResults,
    winner,
    isCompleted,
    openRateA,
    openRateB,
    timeRemaining,
  };
}
