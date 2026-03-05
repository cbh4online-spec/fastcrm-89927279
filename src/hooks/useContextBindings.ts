import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { emitKernelEvent } from '@/lib/kernelEmitter';

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
      return binding;
    },
    onSuccess: (_data, variables) => {
      console.log('[CONTEXT] Binding created', { block_id: variables.block_id, asset_kind: variables.asset_kind });
      queryClient.invalidateQueries({ queryKey: ['context-bindings'] });
      toast.success('Binding criado');

      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'CONTEXT.BINDING_CREATED',
          entity_kind: 'context_binding',
          entity_id: variables.block_id,
          source_module: 'strategy-context-os',
          payload: { block_id: variables.block_id, asset_kind: variables.asset_kind, asset_id: variables.asset_id },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Binding creation failed', err.message);
    },
  });

  const removeBinding = useMutation({
    mutationFn: async (bindingId: string) => {
      const { error } = await supabase.from('context_bindings').delete().eq('id', bindingId);
      if (error) throw error;
      return bindingId;
    },
    onSuccess: (_data, bindingId) => {
      console.log('[CONTEXT] Binding removed', { bindingId });
      queryClient.invalidateQueries({ queryKey: ['context-bindings'] });
      toast.success('Binding removido');

      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'CONTEXT.BINDING_REMOVED',
          entity_kind: 'context_binding',
          entity_id: bindingId,
          source_module: 'strategy-context-os',
          payload: { binding_id: bindingId },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Binding removal failed', err.message);
    },
  });

  return { bindings, isLoading, addBinding, removeBinding };
}
