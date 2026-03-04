import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useContextBindings(blockId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: bindings, isLoading } = useQuery({
    queryKey: ['context-bindings', workspaceId, blockId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('context_bindings')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (blockId) query = query.eq('block_id', blockId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const addBinding = useMutation({
    mutationFn: async (binding: { block_id: string; asset_kind: string; asset_id: string; binding_type?: string }) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.from('context_bindings').insert({ workspace_id: workspaceId, ...binding });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-bindings'] });
      toast.success('Binding criado');
    },
  });

  const removeBinding = useMutation({
    mutationFn: async (bindingId: string) => {
      const { error } = await supabase.from('context_bindings').delete().eq('id', bindingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-bindings'] });
      toast.success('Binding removido');
    },
  });

  return { bindings, isLoading, addBinding, removeBinding };
}
