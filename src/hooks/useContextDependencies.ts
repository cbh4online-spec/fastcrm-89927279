import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { emitAndPersist } from '@/lib/eventBus';

export function useContextDependencies(blockId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['context-dependencies', workspaceId, blockId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('context_dependencies')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (blockId) {
        query = query.or(`source_block_id.eq.${blockId},target_block_id.eq.${blockId}`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const addDependency = useMutation({
    mutationFn: async (dep: {
      source_block_id: string;
      target_block_id: string;
      relation: string;
      strength?: number;
    }) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.from('context_dependencies').insert([{
        workspace_id: workspaceId,
        ...dep,
        strength: dep.strength ?? 50,
      }]);
      if (error) throw error;
      emitAndPersist('dependency.created', {
        workspace_id: workspaceId,
        entity_type: 'context_dependency',
        data: dep as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-dependencies'] });
    },
  });

  const removeDependency = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase.from('context_dependencies').delete().eq('id', depId);
      if (error) throw error;
      emitAndPersist('dependency.deleted', {
        workspace_id: workspaceId!,
        entity_type: 'context_dependency',
        entity_id: depId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-dependencies'] });
    },
  });

  return { dependencies, isLoading, addDependency, removeDependency };
}
