import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useImpactMapData } from '@/hooks/useImpactMapData';
import { ImpactMapNode, type ImpactMapNodeData } from '@/components/impact-map/ImpactMapNode';
import { ImpactMapSidebar } from '@/components/impact-map/ImpactMapSidebar';
import { useNavigate } from 'react-router-dom';
import { Loader2, Network, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const nodeTypes = { impact: ImpactMapNode };

const COLS = 4;
const GAP_X = 280;
const GAP_Y = 180;

const EDGE_COLORS: Record<string, string> = {
  depends_on: 'hsl(var(--primary))',
  influences: 'hsl(var(--chart-2))',
  blocks: 'hsl(0 84% 60%)',
};

export default function ImpactMapPage() {
  const navigate = useNavigate();
  const {
    blocks, dependencies, driftMap,
    impactedIds, impactResults, simulatingId,
    simulateImpact, clearImpact, isLoading,
  } = useImpactMapData();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handleSimulate = useCallback((id: string) => {
    simulateImpact.mutate(id);
  }, [simulateImpact]);

  const handleSelect = useCallback((id: string) => {
    setSelectedBlockId(id);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = blocks.map((b, i) => {
      const drift = driftMap.get(b.id);
      const isSource = simulatingId === b.id || (impactedIds.has(b.id) && impactResults.every(r => r.block_id !== b.id));
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
  }, [blocks, dependencies, driftMap, impactedIds, impactResults, simulatingId, handleSimulate, handleSelect]);

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
                Visualize dependências entre blocos estratégicos · Duplo clique para simular impacto
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          ) : blocks.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Network className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sem blocos de contexto. Cria blocos no Context OS primeiro.</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/context-os')}>
                Ir para Context OS
              </Button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
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
          {selectedBlock && (
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
