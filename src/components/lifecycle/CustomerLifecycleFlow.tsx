import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LifecycleStageNode } from "./LifecycleStageNode";
import { LIFECYCLE_STAGES, type LifecycleStageCounts } from "@/hooks/useCustomerLifecycle";

const nodeTypes = { lifecycleStage: LifecycleStageNode };

interface CustomerLifecycleFlowProps {
  data: LifecycleStageCounts[];
}

export function CustomerLifecycleFlow({ data }: CustomerLifecycleFlowProps) {
  // Only the main flow stages (no churned)
  const mainStages = LIFECYCLE_STAGES.filter(s => s.stage !== 'churned');

  const initialNodes: Node[] = useMemo(() => {
    return mainStages.map((s, i) => ({
      id: s.stage,
      type: "lifecycleStage",
      position: { x: i * 220, y: 80 },
      data: {
        label: s.label,
        count: data.find(d => d.stage === s.stage)?.count || 0,
        icon: s.icon,
        color: s.color,
        isFirst: i === 0,
        isLast: i === mainStages.length - 1,
      },
      draggable: false,
    }));
  }, [data]);

  const initialEdges: Edge[] = useMemo(() => {
    return mainStages.slice(0, -1).map((s, i) => ({
      id: `${s.stage}-${mainStages[i + 1].stage}`,
      source: s.stage,
      target: mainStages[i + 1].stage,
      animated: true,
      style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
    }));
  }, []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Prospect/Customer divider annotation
  const prospectLabel = useMemo(() => {
    // Prospect = visitor, lead, prospect | Customer = sales, onboarding, customer
    const prospectWidth = 3 * 220; // first 3 stages
    const customerStart = 3 * 220;
    const customerWidth = 3 * 220;

    return (
      <div className="absolute bottom-2 left-0 right-0 flex pointer-events-none" style={{ zIndex: 10 }}>
        <div className="flex-1 text-center" style={{ maxWidth: prospectWidth }}>
          <div className="border-t-2 border-dashed border-amber-400/50 mx-8" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Prospect</span>
        </div>
        <div className="flex-1 text-center" style={{ maxWidth: customerWidth }}>
          <div className="border-t-2 border-dashed border-emerald-400/50 mx-8" />
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Customer</span>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="relative w-full h-[280px] bg-card border rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
      </ReactFlow>
      {prospectLabel}
    </div>
  );
}
