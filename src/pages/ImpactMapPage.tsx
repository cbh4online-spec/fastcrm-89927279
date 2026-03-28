import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useImpactMapData } from '@/hooks/useImpactMapData';
import { useKernelEntities, useKernelLinks } from '@/hooks/useKernelEntities';
import { ImpactMapNode, type ImpactMapNodeData } from '@/components/impact-map/ImpactMapNode';
import { ImpactMapSidebar } from '@/components/impact-map/ImpactMapSidebar';
import { ImpactMapLegend } from '@/components/impact-map/ImpactMapLegend';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Network, RotateCcw, Layers, History,
  MousePointerClick, Eye, Zap, CheckCircle2, AlertTriangle, XCircle, Circle, GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

const nodeTypes = { impact: ImpactMapNode };

const COLS = 4;
const GAP_X = 300;
const GAP_Y = 200;

const EDGE_COLORS: Record<string, string> = {
  depends_on: 'hsl(var(--primary))',
  influences: 'hsl(var(--chart-2))',
  blocks: 'hsl(0 84% 60%)',
  uses: 'hsl(var(--chart-4))',
  feeds_from: 'hsl(var(--chart-3))',
  publishes_to: 'hsl(var(--chart-5))',
};

const EDGE_LABELS_PT: Record<string, string> = {
  depends_on: 'Depende de',
  influences: 'Influencia',
  blocks: 'Bloqueia',
  uses: 'Utiliza',
  feeds_from: 'Alimenta',
  publishes_to: 'Publica para',
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

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    savePosition(node.id, viewMode, node.position.x, node.position.y);
  }, [savePosition, viewMode]);

  // Stats
  const stats = useMemo(() => {
    const healthCounts = { filled: 0, aging: 0, stale: 0, empty: 0 };
    blocks.forEach(b => {
      const h = healthMap.get(b.id)?.state || 'empty';
      healthCounts[h]++;
    });
    const driftSevere = Array.from(driftMap.values()).filter(d => d.severity === 'high' || d.severity === 'critical').length;
    return { total: blocks.length, edges: dependencies.length, driftSevere, ...healthCounts };
  }, [blocks, healthMap, driftMap, dependencies]);

  // Context OS view
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
        strokeWidth: Math.max(2, dep.strength / 25),
        strokeDasharray: dep.relation === 'influences' ? '6 3' : undefined,
      },
      label: EDGE_LABELS_PT[dep.relation] || dep.relation.replace('_', ' '),
      labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
    }));

    return { nodes, edges };
  }, [blocks, dependencies, driftMap, impactedIds, impactResults, simulatingId, staleIds, handleSimulate, handleSelect, getPosition, healthMap]);

  // Kernel view
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
        strokeWidth: Math.max(2, (l.confidence ?? 0.5) * 4),
      },
      label: EDGE_LABELS_PT[l.relation_type] || l.relation_type.replace('_', ' '),
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
        <div className="px-6 py-4 border-b border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Mapa de Impacto</h1>
                <p className="text-sm text-muted-foreground">
                  Visualize como alterações numa área do negócio propagam impacto para outras
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'context' | 'kernel')}>
                <TabsList className="h-8">
                  <TabsTrigger value="context" className="text-xs h-7 gap-1">
                    <Network className="h-3 w-3" /> Contexto
                  </TabsTrigger>
                  <TabsTrigger value="kernel" className="text-xs h-7 gap-1">
                    <Layers className="h-3 w-3" /> Kernel
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
                            · {s.direction} · {new Date(s.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

          {/* Guide steps */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold">1</div>
              <MousePointerClick className="h-3 w-3" />
              <span>Clique para detalhes</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold">2</div>
              <Zap className="h-3 w-3" />
              <span>Duplo clique para simular</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold">3</div>
              <Eye className="h-3 w-3" />
              <span>Veja propagação a vermelho</span>
            </div>
          </div>

          {/* Stats bar */}
          {stats.total > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <Network className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.total}</span>
                <span className="text-muted-foreground">blocos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.edges}</span>
                <span className="text-muted-foreground">dependências</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{stats.filled}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 font-medium">{stats.aging}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <XCircle className="h-3 w-3 text-red-400" />
                <span className="text-red-400 font-medium">{stats.stale}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Circle className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">{stats.empty}</span>
              </div>
              {stats.driftSevere > 0 && (
                <>
                  <div className="h-3 w-px bg-border" />
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {stats.driftSevere} drift{stats.driftSevere !== 1 ? 's' : ''} severo{stats.driftSevere !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
              {/* Health bar */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Saúde geral</span>
                <div className="w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden flex">
                  {stats.total > 0 && (
                    <>
                      <div className="h-full bg-emerald-500" style={{ width: `${(stats.filled / stats.total) * 100}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${(stats.aging / stats.total) * 100}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${(stats.stale / stats.total) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeView.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
                <Network className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <div className="text-center max-w-md space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {viewMode === 'context' ? 'Sem blocos de contexto' : 'Sem entidades no Kernel'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'context'
                    ? 'O Mapa de Impacto visualiza como os blocos do teu negócio (Estratégia, Ofertas, Metas, Equipa…) se influenciam mutuamente. Começa por preencher os blocos no Context OS.'
                    : 'O Kernel agrega entidades de todos os módulos. Emita eventos para popular o grafo de relações.'}
                </p>
              </div>
              {/* Example diagram */}
              {viewMode === 'context' && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                  <div className="px-3 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5">Estratégia</div>
                  <span>→</span>
                  <div className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5">Metas</div>
                  <span>→</span>
                  <div className="px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5">Ofertas</div>
                  <span>→</span>
                  <div className="px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5">Financeiro</div>
                </div>
              )}
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

          {/* Legend */}
          {activeView.nodes.length > 0 && <ImpactMapLegend />}

          {/* Sidebar */}
          {selectedBlock && viewMode === 'context' && (
            <ImpactMapSidebar
              block={selectedBlock}
              drift={driftMap.get(selectedBlock.id)}
              healthState={healthMap.get(selectedBlock.id)?.state}
              fillPercent={healthMap.get(selectedBlock.id)?.fillPercent}
              impactResults={impactResults}
              dependencies={dependencies}
              blocks={blocks}
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
