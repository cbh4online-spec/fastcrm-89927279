import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface LifecycleNodeData {
  label: string;
  count: number;
  icon: string;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
}

function LifecycleStageNodeComponent({ data }: NodeProps) {
  const { label, count, icon, color, isFirst, isLast } = data as unknown as LifecycleNodeData;

  return (
    <div
      className="relative rounded-xl border-2 bg-card shadow-md px-6 py-5 min-w-[160px] text-center transition-shadow hover:shadow-lg"
      style={{ borderColor: color }}
    >
      {!isFirst && <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />}
      {!isLast && <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />}

      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-foreground">{count}</div>
    </div>
  );
}

export const LifecycleStageNode = memo(LifecycleStageNodeComponent);
