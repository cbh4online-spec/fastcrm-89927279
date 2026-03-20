import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

interface TriggerConfig {
  trigger_event: string;
  wait_hours: number;
  action_type: string;
  action_payload?: any;
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
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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
    isLoading: triggersQuery.isLoading,
    createTrigger,
    updateTrigger,
    deleteTrigger,
  };
}
