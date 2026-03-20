import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

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
      return data;
    },
    enabled: !!campaignId,
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

      // Link to campaign
      await supabase.from('marketing_campaigns').update({ ab_test_id: data.id }).eq('id', campaignId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-ab-test', campaignId] });
      toast.success('Teste A/B configurado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar teste A/B'),
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

  return {
    abTest: test,
    isLoading: abTestQuery.isLoading,
    createAbTest,
    getAbTestResults,
    winner,
    isCompleted,
  };
}
