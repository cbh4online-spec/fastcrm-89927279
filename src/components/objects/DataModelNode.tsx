import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getIconByName } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";

export interface DataModelNodeData {
  label: string;
  icon: string;
  color: string;
  fieldCount: number;
  isCore: boolean;
}

function DataModelNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as DataModelNodeData;
  const Icon = getIconByName(nodeData.icon);

  return (
    <div className="relative w-[200px] rounded-xl border bg-card shadow-md px-4 py-3 transition-shadow hover:shadow-lg"
      style={{ borderColor: nodeData.color || 'hsl(var(--border))' }}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />

      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60" style={{ color: nodeData.color }}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{nodeData.label}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {nodeData.isCore && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Core</Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{nodeData.fieldCount} campos</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DataModelNode = memo(DataModelNodeComponent);
