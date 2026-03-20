import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useCampaignSuppressions() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const suppressionsQuery = useQuery({
    queryKey: ['campaign-suppressions', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('campaign_suppressions')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const addSuppression = useMutation({
    mutationFn: async ({ email, reason }: { email: string; reason: string }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase.from('campaign_suppressions').insert({
        workspace_id: currentWorkspace.id,
        email: email.toLowerCase(),
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-suppressions'] });
      toast.success('Email adicionado à lista de supressão');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar supressão'),
  });

  const removeSuppression = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_suppressions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-suppressions'] });
      toast.success('Supressão removida');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover supressão'),
  });

  const importSuppressions = useMutation({
    mutationFn: async (emails: Array<{ email: string; reason: string }>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const items = emails.map(e => ({
        workspace_id: currentWorkspace.id,
        email: e.email.toLowerCase(),
        reason: e.reason || 'manual',
      }));
      const { error } = await supabase.from('campaign_suppressions').upsert(items, { onConflict: 'workspace_id,email', ignoreDuplicates: true });
      if (error) throw error;
      return items.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-suppressions'] });
      toast.success(`${count} supressões importadas`);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao importar'),
  });

  return {
    suppressions: suppressionsQuery.data || [],
    isLoading: suppressionsQuery.isLoading,
    suppressionCount: suppressionsQuery.data?.length || 0,
    addSuppression,
    removeSuppression,
    importSuppressions,
  };
}
