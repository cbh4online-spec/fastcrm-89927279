import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useImpactMapData } from '@/hooks/useImpactMapData';
import { useKernelEntities, useKernelLinks } from '@/hooks/useKernelEntities';
import { useChangeEvents } from '@/hooks/useChangeEvents';
import { ImpactMapNode, type ImpactMapNodeData } from '@/components/impact-map/ImpactMapNode';
import { ImpactMapSidebar } from '@/components/impact-map/ImpactMapSidebar';
import { useNavigate } from 'react-router-dom';
import { Loader2, Network, RotateCcw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const nodeTypes = { impact: ImpactMapNode };

const COLS = 4;
const GAP_X = 280;
const GAP_Y = 180;

const EDGE_COLORS: Record<string, string> = {
  depends_on: 'hsl(var(--primary))',
  influences: 'hsl(var(--chart-2))',
  blocks: 'hsl(0 84% 60%)',
  uses: 'hsl(var(--chart-4))',
  feeds_from: 'hsl(var(--chart-3))',
  publishes_to: 'hsl(var(--chart-5))',
};

export default function ImpactMapPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const {
    blocks, dependencies, driftMap,
    impactedIds, impactResults, simulatingId,
    simulateImpact, clearImpact, isLoading,
  } = useImpactMapData();

  const { entities } = useKernelEntities();
  const { links } = useKernelLinks();

  // Fetch impact_map items for status coloring
  const { data: impactMapItems } = useQuery({
    queryKey: ['impact-map-items', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from('impact_map')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'needs_review');
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const staleIds = useMemo(() => {
    return new Set((impactMapItems ?? []).map(i => i.affected_id));
  }, [impactMapItems]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'context' | 'kernel'>('context');

  const handleSimulate = useCallback((id: string) => {
    simulateImpact.mutate(id);
  }, [simulateImpact]);

  const handleSelect = useCallback((id: string) => {
    setSelectedBlockId(id);
  }, []);

  // Context OS view (existing)
  const contextView = useMemo(() => {
    const nodes: Node[] = blocks.map((b, i) => {
      const drift = driftMap.get(b.id);
      const isSource = simulatingId === b.id || (impactedIds.has(b.id) && impactResults.every(r => r.block_id !== b.id));
      const isStale = staleIds.has(b.id);
      return {
        id: b.id,
        type: 'impact',
        position: {
          x: (i % COLS) * GAP_X + 60,
          y: Math.floor(i / COLS) * GAP_Y + 60,
        },
        data: {
          label: b.title,
          blockType: b.block_type,
          contextScore: b.context_score,
          driftSeverity: drift?.severity,
          driftScore: drift?.drift_score,
          staleDays: drift?.stale_days,
          isImpacted: impactedIds.has(b.id),
          isSource,
          isStale,
          onSimulate: handleSimulate,
          onSelect: handleSelect,
        } satisfies ImpactMapNodeData,
        draggable: true,
      };
    });

    const edges: Edge[] = dependencies.map((dep) => ({
      id: dep.id,
      source: dep.source_block_id,
      target: dep.target_block_id,
      type: 'smoothstep',
      animated: impactedIds.has(dep.source_block_id) && impactedIds.has(dep.target_block_id),
      style: {
        stroke: EDGE_COLORS[dep.relation] || 'hsl(var(--muted-foreground))',
        strokeWidth: Math.max(1, dep.strength / 30),
        strokeDasharray: dep.relation === 'influences' ? '6 3' : undefined,
      },
      label: dep.relation.replace('_', ' '),
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    }));

    return { nodes, edges };
  }, [blocks, dependencies, driftMap, impactedIds, impactResults, simulatingId, staleIds, handleSimulate, handleSelect]);

  // Kernel entities view
  const kernelView = useMemo(() => {
    if (!entities?.length) return { nodes: [], edges: [] };

    const nodes: Node[] = entities.map((e, i) => ({
      id: `${e.kind}:${e.entity_id}`,
      type: 'impact',
      position: {
        x: (i % COLS) * GAP_X + 60,
        y: Math.floor(i / COLS) * GAP_Y + 60,
      },
      data: {
        label: e.title ?? e.entity_id,
        blockType: e.kind,
        isStale: staleIds.has(e.entity_id),
        isImpacted: staleIds.has(e.entity_id),
        onSelect: () => {},
        onSimulate: () => {},
      } as ImpactMapNodeData,
      draggable: true,
    }));

    const edges: Edge[] = (links ?? []).map((l) => ({
      id: l.id,
      source: `${l.from_kind}:${l.from_id}`,
      target: `${l.to_kind}:${l.to_id}`,
      type: 'smoothstep',
      style: {
        stroke: EDGE_COLORS[l.relation_type] || 'hsl(var(--muted-foreground))',
        strokeWidth: Math.max(1, (l.confidence ?? 0.5) * 3),
      },
      label: l.relation_type.replace('_', ' '),
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    }));

    return { nodes, edges };
  }, [entities, links, staleIds]);

  const activeView = viewMode === 'context' ? contextView : kernelView;
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Mapa de Impacto</h1>
              <p className="text-sm text-muted-foreground">
                Visualize dependências entre blocos e entidades · Duplo clique para simular
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'context' | 'kernel')}>
              <TabsList className="h-8">
                <TabsTrigger value="context" className="text-xs h-7 gap-1">
                  <Network className="h-3 w-3" /> Context
                </TabsTrigger>
                <TabsTrigger value="kernel" className="text-xs h-7 gap-1">
                  <Layers className="h-3 w-3" /> Kernel
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {impactedIds.size > 0 && (
              <>
                <Badge variant="destructive" className="text-xs">
                  {impactResults.length} bloco{impactResults.length !== 1 ? 's' : ''} afetado{impactResults.length !== 1 ? 's' : ''}
                </Badge>
                <Button variant="outline" size="sm" onClick={clearImpact} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3 w-3" />
                  Limpar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeView.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Network className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {viewMode === 'context'
                  ? 'Sem blocos de contexto. Cria blocos no Context OS primeiro.'
                  : 'Sem entidades no Kernel. Emita eventos para popular o grafo.'}
              </p>
              {viewMode === 'context' && (
                <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/context-os')}>
                  Ir para Context OS
                </Button>
              )}
            </div>
          ) : (
            <ReactFlow
              nodes={activeView.nodes}
              edges={activeView.edges}
              nodeTypes={nodeTypes}
              nodesConnectable={false}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              onPaneClick={() => setSelectedBlockId(null)}
            >
              <Background gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeStrokeWidth={3}
                pannable
                zoomable
                className="!bg-background/80 !border-border/30"
              />
            </ReactFlow>
          )}

          {/* Sidebar */}
          {selectedBlock && viewMode === 'context' && (
            <ImpactMapSidebar
              block={selectedBlock}
              drift={driftMap.get(selectedBlock.id)}
              impactResults={impactResults}
              isSimulating={simulatingId === selectedBlock.id}
              onSimulate={() => handleSimulate(selectedBlock.id)}
              onClose={() => setSelectedBlockId(null)}
              onNavigate={() => navigate('/dashboard/context-os')}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
