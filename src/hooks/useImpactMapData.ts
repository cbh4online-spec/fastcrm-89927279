import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useState, useCallback } from 'react';

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
}

export function useImpactMapData() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
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

  const driftMap = new Map(driftData.map((d) => [d.block_id, d]));

  const simulateImpact = useMutation({
    mutationFn: async (sourceBlockId: string) => {
      if (!workspaceId) throw new Error('No workspace');
      setSimulatingId(sourceBlockId);
      const { data, error } = await supabase.functions.invoke('compute-impact', {
        body: { source_block_id: sourceBlockId, workspace_id: workspaceId },
      });
      if (error) throw error;
      return data as { impacts: ImpactResult[] };
    },
    onSuccess: (data, sourceBlockId) => {
      const ids = new Set<string>([sourceBlockId, ...data.impacts.map((i) => i.block_id)]);
      setImpactedIds(ids);
      setImpactResults(data.impacts);
      setSimulatingId(null);
    },
    onError: () => setSimulatingId(null),
  });

  const clearImpact = useCallback(() => {
    setImpactedIds(new Set());
    setImpactResults([]);
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
  };
}
