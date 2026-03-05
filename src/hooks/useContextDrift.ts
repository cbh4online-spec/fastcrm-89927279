import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { emitKernelEvent } from '@/lib/kernelEmitter';

export function useContextDrift() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: driftData, isLoading } = useQuery({
    queryKey: ['context-drift', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('context_drift')
        .select('*, context_blocks(title, block_type)')
        .eq('workspace_id', workspaceId)
        .order('drift_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const recompute = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.functions.invoke('compute-drift', {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[CONTEXT] Drift recomputed', { workspaceId });
      queryClient.invalidateQueries({ queryKey: ['context-drift', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['context-alerts', workspaceId] });

      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'CONTEXT.DRIFT_RECOMPUTED',
          entity_kind: 'context_drift',
          entity_id: workspaceId,
          source_module: 'strategy-context-os',
          payload: { workspace_id: workspaceId },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[CONTEXT] Drift recompute failed', err.message);
    },
  });

  const getDriftForBlock = (blockId: string) => {
    return driftData?.find((d) => d.block_id === blockId) ?? null;
  };

  return { driftData, isLoading, recompute, getDriftForBlock };
}
