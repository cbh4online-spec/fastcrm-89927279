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
import { Loader2, Network, RotateCcw, Layers, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    blocks, dependencies, driftMap, healthMap,
    impactedIds, impactResults, simulatingId,
    simulateImpact, clearImpact, isLoading,
    getPosition, savePosition,
    snapshots, restoreSnapshot,
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
    simulateImpact.mutate({ sourceBlockId: id, direction: 'bidirectional' });
  }, [simulateImpact]);

  const handleSelect = useCallback((id: string) => {
    setSelectedBlockId(id);
  }, []);

  // Persist position on drag end
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    savePosition(node.id, viewMode, node.position.x, node.position.y);
  }, [savePosition, viewMode]);

  // Context OS view with persisted positions
  const contextView = useMemo(() => {
    const nodes: Node[] = blocks.map((b, i) => {
      const drift = driftMap.get(b.id);
      const isSource = simulatingId === b.id || (impactedIds.has(b.id) && impactResults.every(r => r.block_id !== b.id));
      const isStale = staleIds.has(b.id);
      const fallbackX = (i % COLS) * GAP_X + 60;
      const fallbackY = Math.floor(i / COLS) * GAP_Y + 60;
      const pos = getPosition(b.id, 'context', fallbackX, fallbackY);
      return {
        id: b.id,
        type: 'impact',
        position: pos,
        data: {
          label: b.title,
          blockType: b.block_type,
          contextScore: b.score,
          fillPercent: healthMap.get(b.id)?.fillPercent,
          healthState: healthMap.get(b.id)?.state,
          driftSeverity: drift?.severity,
          driftScore: drift?.drift_score,
          staleDays: drift?.stale_days,
          isImpacted: impactedIds.has(b.id),
          isSource,
          isStale,
          impactDirection: impactResults.find(r => r.block_id === b.id)?.direction,
          dependencyCount: dependencies.filter(d => d.source_block_id === b.id || d.target_block_id === b.id).length,
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
  }, [blocks, dependencies, driftMap, impactedIds, impactResults, simulatingId, staleIds, handleSimulate, handleSelect, getPosition]);

  // Kernel entities view with persisted positions
  const kernelView = useMemo(() => {
    if (!entities?.length) return { nodes: [], edges: [] };

    const nodes: Node[] = entities.map((e, i) => {
      const nodeKey = `${e.kind}:${e.entity_id}`;
      const fallbackX = (i % COLS) * GAP_X + 60;
      const fallbackY = Math.floor(i / COLS) * GAP_Y + 60;
      const pos = getPosition(nodeKey, 'kernel', fallbackX, fallbackY);
      return {
        id: nodeKey,
        type: 'impact',
        position: pos,
        data: {
          label: e.title ?? e.entity_id,
          blockType: e.kind,
          isStale: staleIds.has(e.entity_id),
          isImpacted: staleIds.has(e.entity_id),
          onSelect: () => {},
          onSimulate: () => {},
        } as ImpactMapNodeData,
        draggable: true,
      };
    });

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
  }, [entities, links, staleIds, getPosition]);

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
                Visualize dependências entre blocos e entidades · Duplo clique para simular (bidirecional)
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

            {/* Snapshot history */}
            {snapshots.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <History className="h-3 w-3" />
                    Histórico ({snapshots.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="end">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Simulações recentes</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {snapshots.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => restoreSnapshot(s)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-foreground">{s.source_block_id.slice(0, 8)}…</span>
                        <span className="text-muted-foreground ml-1">
                          · {s.direction} · {new Date(s.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

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
              onNodeDragStop={handleNodeDragStop}
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
