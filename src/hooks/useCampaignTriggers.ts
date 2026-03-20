import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface CampaignTrigger {
  id: string;
  campaign_id: string;
  workspace_id: string;
  trigger_event: 'opened' | 'clicked' | 'not_opened' | 'not_clicked' | 'bounced';
  wait_hours: number;
  action_type: 'enroll_sequence' | 'send_campaign' | 'add_tag';
  action_payload: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

interface TriggerConfig {
  trigger_event: string;
  wait_hours: number;
  action_type: string;
  action_payload?: any;
}

export interface TriggerStats {
  total: number;
  executed: number;
  pending: number;
}

export function useCampaignTriggers(campaignId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const triggersQuery = useQuery({
    queryKey: ['campaign-triggers', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('campaign_triggers')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CampaignTrigger[];
    },
    enabled: !!campaignId,
  });

  const triggerStatsQuery = useQuery({
    queryKey: ['campaign-trigger-stats', campaignId],
    queryFn: async (): Promise<TriggerStats | null> => {
      if (!campaignId) return null;
      const { data } = await supabase
        .from('campaign_trigger_executions')
        .select('action_result')
        .eq('trigger_id', campaignId);
      const total = data?.length ?? 0;
      const executed = data?.filter((r: any) => r.action_result?.status === 'success').length ?? 0;
      return { total, executed, pending: total - executed };
    },
    enabled: !!campaignId,
  });

  const createTrigger = useMutation({
    mutationFn: async (config: TriggerConfig) => {
      if (!campaignId || !currentWorkspace?.id) throw new Error('Missing data');
      const { error } = await supabase.from('campaign_triggers').insert({
        workspace_id: currentWorkspace.id,
        campaign_id: campaignId,
        ...config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-triggers', campaignId] });
      toast.success('Trigger criado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar trigger'),
  });

  const updateTrigger = useMutation({
    mutationFn: async ({ id, ...config }: { id: string } & Partial<TriggerConfig & { is_active: boolean }>) => {
      const { error } = await supabase.from('campaign_triggers').update(config).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-triggers', campaignId] });
      toast.success('Trigger atualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar trigger'),
  });

  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_triggers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-triggers', campaignId] });
      toast.success('Trigger eliminado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao eliminar trigger'),
  });

  return {
    triggers: triggersQuery.data || [],
    triggerStats: triggerStatsQuery.data || null,
    isLoading: triggersQuery.isLoading,
    createTrigger,
    updateTrigger,
    deleteTrigger,
  };
}
