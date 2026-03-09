import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useState, useCallback } from 'react';
import { emitKernelEvent } from '@/lib/kernelEmitter';

export interface ImpactMapBlock {
  id: string;
  title: string;
  block_type: string;
  context_score?: number;
  updated_at?: string;
}

export interface ImpactMapDep {
  id: string;
  source_block_id: string;
  target_block_id: string;
  relation: string;
  strength: number;
}

export interface DriftEntry {
  block_id: string;
  drift_score: number;
  severity: string;
  stale_days: number;
}

export interface ImpactResult {
  block_id: string;
  depth: number;
  impact_score: number;
  title?: string;
  block_type?: string;
  direction?: string;
}

export interface NodePosition {
  node_key: string;
  view_mode: string;
  x: number;
  y: number;
}

export function useImpactMapData() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [impactedIds, setImpactedIds] = useState<Set<string>>(new Set());
  const [impactResults, setImpactResults] = useState<ImpactResult[]>([]);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ['impact-map-blocks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('context_blocks')
        .select('id, title, block_type, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ImpactMapBlock[];
    },
    enabled: !!workspaceId,
  });

  const { data: dependencies = [], isLoading: depsLoading } = useQuery({
    queryKey: ['impact-map-deps', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('context_dependencies')
        .select('id, source_block_id, target_block_id, relation, strength')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data ?? []) as ImpactMapDep[];
    },
    enabled: !!workspaceId,
  });

  const { data: driftData = [] } = useQuery({
    queryKey: ['impact-map-drift', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('context_drift')
        .select('block_id, drift_score, severity, stale_days')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data ?? []) as DriftEntry[];
    },
    enabled: !!workspaceId,
  });

  // Load persisted node positions
  const { data: savedPositions = [] } = useQuery({
    queryKey: ['impact-map-positions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('impact_map_positions')
        .select('node_key, view_mode, x, y')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data ?? []) as NodePosition[];
    },
    enabled: !!workspaceId,
  });

  // Load recent simulation snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['impact-simulation-snapshots', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('impact_simulation_snapshots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const driftMap = new Map(driftData.map((d) => [d.block_id, d]));

  // Build position lookup maps
  const positionMap = new Map(
    savedPositions.map((p) => [`${p.view_mode}:${p.node_key}`, { x: p.x, y: p.y }])
  );

  const getPosition = useCallback((nodeKey: string, viewMode: string, fallbackX: number, fallbackY: number) => {
    const saved = positionMap.get(`${viewMode}:${nodeKey}`);
    return saved ?? { x: fallbackX, y: fallbackY };
  }, [positionMap]);

  // Save node position on drag end
  const savePosition = useCallback(async (nodeKey: string, viewMode: string, x: number, y: number) => {
    if (!workspaceId) return;
    await supabase
      .from('impact_map_positions')
      .upsert(
        { workspace_id: workspaceId, node_key: nodeKey, view_mode: viewMode, x, y, updated_at: new Date().toISOString() },
        { onConflict: 'workspace_id,node_key,view_mode' }
      );
    queryClient.invalidateQueries({ queryKey: ['impact-map-positions', workspaceId] });
  }, [workspaceId, queryClient]);

  const simulateImpact = useMutation({
    mutationFn: async ({ sourceBlockId, direction = 'bidirectional' }: { sourceBlockId: string; direction?: string }) => {
      if (!workspaceId) throw new Error('No workspace');
      setSimulatingId(sourceBlockId);
      const { data, error } = await supabase.functions.invoke('compute-impact', {
        body: { source_block_id: sourceBlockId, workspace_id: workspaceId, direction },
      });
      if (error) throw error;
      return data as { impacts: ImpactResult[]; direction: string };
    },
    onSuccess: async (data, variables) => {
      const ids = new Set<string>([variables.sourceBlockId, ...data.impacts.map((i) => i.block_id)]);
      setImpactedIds(ids);
      setImpactResults(data.impacts);
      setSimulatingId(null);
      console.log('[CONTEXT] Impact simulated (bidirectional)', { sourceBlockId: variables.sourceBlockId, impacted: data.impacts.length });

      // Persist snapshot
      if (workspaceId) {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from('impact_simulation_snapshots').insert({
          workspace_id: workspaceId,
          source_block_id: variables.sourceBlockId,
          direction: data.direction ?? 'bidirectional',
          results: JSON.parse(JSON.stringify(data.impacts)),
          created_by: userData?.user?.id ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ['impact-simulation-snapshots', workspaceId] });

        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'IMPACT.MAP_UPDATED',
          entity_kind: 'context_block',
          entity_id: variables.sourceBlockId,
          source_module: 'strategy-context-os',
          payload: { source_block_id: variables.sourceBlockId, impacted_count: data.impacts.length, direction: data.direction },
        });
      }
    },
    onError: (err: Error) => {
      setSimulatingId(null);
      console.warn('[CONTEXT] Impact simulation failed', err.message);
    },
  });

  const clearImpact = useCallback(() => {
    setImpactedIds(new Set());
    setImpactResults([]);
    setSimulatingId(null);
  }, []);

  // Restore a past snapshot
  const restoreSnapshot = useCallback((snapshot: { source_block_id: string; results: ImpactResult[] }) => {
    const ids = new Set<string>([snapshot.source_block_id, ...(snapshot.results ?? []).map((i: ImpactResult) => i.block_id)]);
    setImpactedIds(ids);
    setImpactResults(snapshot.results ?? []);
    setSimulatingId(null);
  }, []);

  return {
    blocks,
    dependencies,
    driftMap,
    impactedIds,
    impactResults,
    simulatingId,
    simulateImpact,
    clearImpact,
    isLoading: blocksLoading || depsLoading,
    getPosition,
    savePosition,
    snapshots,
    restoreSnapshot,
  };
}
