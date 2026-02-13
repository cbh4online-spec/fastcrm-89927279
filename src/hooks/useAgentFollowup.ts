import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface FollowupPolicy {
  id: string;
  workspace_id: string;
  bot_id: string;
  channel: string;
  scenarios: Record<string, boolean>;
  cadence: { delays_minutes: number[] };
  working_hours: Record<string, unknown>;
  allow_channel_switching: boolean;
  switch_rules: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export function useFollowupPolicies(botId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['ai-followup-policies', currentWorkspace?.id, botId],
    queryFn: async () => {
      if (!currentWorkspace?.id || !botId) return [];
      const { data, error } = await supabase
        .from('ai_followup_policies')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FollowupPolicy[];
    },
    enabled: !!currentWorkspace?.id && !!botId,
  });
}

export function useCreateFollowupPolicy() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (data: Omit<FollowupPolicy, 'id' | 'workspace_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('ai_followup_policies')
        .insert({ ...data, workspace_id: currentWorkspace!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-followup-policies'] });
      toast.success('Política de follow-up criada');
    },
    onError: (e) => toast.error('Erro ao criar política', { description: (e as Error).message }),
  });
}

export function useUpdateFollowupPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FollowupPolicy> & { id: string }) => {
      const { error } = await supabase.from('ai_followup_policies').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-followup-policies'] });
      toast.success('Política atualizada');
    },
  });
}

export function useDeleteFollowupPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_followup_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-followup-policies'] });
      toast.success('Política removida');
    },
  });
}
