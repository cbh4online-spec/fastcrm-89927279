import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface AlertPolicy {
  workspace_id: string;
  max_warn_per_day: number;
  max_risk_per_day: number;
  cooldown_hours: number;
}

export function useAlertPolicy() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: policy, isLoading } = useQuery({
    queryKey: ['alert-policy', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from('alert_policy' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AlertPolicy) ?? { workspace_id: workspaceId, max_warn_per_day: 5, max_risk_per_day: 3, cooldown_hours: 24 };
    },
    enabled: !!workspaceId,
  });

  const updatePolicy = useMutation({
    mutationFn: async (updates: Partial<Omit<AlertPolicy, 'workspace_id'>>) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase
        .from('alert_policy' as any)
        .upsert({
          workspace_id: workspaceId,
          ...updates,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-policy', workspaceId] });
      toast.success('Política de alertas atualizada');
    },
    onError: (err: Error) => toast.error('Erro: ' + err.message),
  });

  return { policy, isLoading, updatePolicy };
}
