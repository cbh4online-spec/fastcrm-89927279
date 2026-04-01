import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { AICampaignRecommendation } from '@/types/marketing';

function mapRec(row: any): AICampaignRecommendation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    recommendationType: row.recommendation_type,
    recommendationData: row.recommendation_data || {},
    reasoning: row.reasoning,
    status: row.status,
    acceptedAt: row.accepted_at,
    dismissedAt: row.dismissed_at,
    createdAt: row.created_at,
  };
}

export function useAIRecommendations(campaignId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const qk = ['ai-recommendations', campaignId || 'all', currentWorkspace?.id];

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from('ai_campaign_recommendations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (campaignId) q = q.eq('campaign_id', campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(mapRec);
    },
    enabled: !!currentWorkspace?.id,
  });

  const pendingCount = (query.data || []).filter(r => r.status === 'pending').length;

  const acceptRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_campaign_recommendations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Recomendação aceite');
    },
  });

  const dismissRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_campaign_recommendations')
        .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.info('Recomendação ignorada');
    },
  });

  const generateRecommendation = useMutation({
    mutationFn: async (input: { action: string; campaignId?: string; campaignData?: any }) => {
      const { data, error } = await supabase.functions.invoke('marketing-ai-copilot', {
        body: input,
      });
      if (error) throw error;

      // Save recommendation to DB
      if (data && currentWorkspace?.id) {
        await supabase.from('ai_campaign_recommendations').insert({
          workspace_id: currentWorkspace.id,
          campaign_id: input.campaignId || null,
          recommendation_type: input.action.replace('optimize_', '').replace('analyze_', '').replace('recommend_', ''),
          recommendation_data: data,
          reasoning: data.reasoning || data.summary || null,
        });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Recomendação gerada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao gerar recomendação'),
  });

  return {
    recommendations: query.data || [],
    pendingCount,
    isLoading: query.isLoading,
    acceptRecommendation,
    dismissRecommendation,
    generateRecommendation,
  };
}
