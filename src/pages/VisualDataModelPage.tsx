import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DataModelNode } from "@/components/objects/DataModelNode";
import { useCustomObjects } from "@/hooks/useCustomObjects";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OBJECT_REGISTRY } from "@/config/objectRegistry";
import { Link } from "react-router-dom";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const nodeTypes = { dataModel: DataModelNode };

const COLS = 3;
const GAP_X = 300;
const GAP_Y = 200;

export default function VisualDataModelPage() {
  const { data: customObjects = [], isLoading: objLoading } = useCustomObjects();
  const { currentWorkspace } = useWorkspace();

  const { data: relPairs = [], isLoading: relLoading } = useQuery({
    queryKey: ["data-model-edges", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await (supabase
        .from("object_relationships")
        .select("source_object_id, target_object_id") as any)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of (data || [])) {
        const key = [r.source_object_id, r.target_object_id].sort().join("__");
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).map(([key, count]) => {
        const [a, b] = key.split("__");
        return { source: a, target: b, count };
      });
    },
    enabled: !!currentWorkspace,
  });

  const { nodes, edges } = useMemo(() => {
    const allObjects: { id: string; label: string; icon: string; color: string; fieldCount: number; isCore: boolean }[] = [];

    Object.values(OBJECT_REGISTRY).forEach((entry) => {
      allObjects.push({
        id: `core:${entry.slug}`,
        label: entry.labelPt,
        icon: entry.icon.displayName || entry.icon.name || "Package",
        color: entry.color.replace("text-", "").includes("blue") ? "#2563eb"
          : entry.color.includes("emerald") ? "#059669"
          : entry.color.includes("amber") ? "#d97706" : "#6b7280",
        fieldCount: 0,
        isCore: true,
      });
    });

    customObjects.forEach((obj) => {
      allObjects.push({
        id: obj.id,
        label: obj.name,
        icon: obj.icon || "Package",
        color: obj.color || "#6b7280",
        fieldCount: 0,
        isCore: false,
      });
    });

    const nodes: Node[] = allObjects.map((obj, i) => ({
      id: obj.id,
      type: "dataModel",
      position: {
        x: (i % COLS) * GAP_X + 50,
        y: Math.floor(i / COLS) * GAP_Y + 50,
      },
      data: {
        label: obj.label,
        icon: obj.icon,
        color: obj.color,
        fieldCount: obj.fieldCount,
        isCore: obj.isCore,
      },
      draggable: true,
    }));

    const nodeIds = new Set(allObjects.map((o) => o.id));

    const edges: Edge[] = relPairs
      .filter((p) => nodeIds.has(p.source) && nodeIds.has(p.target))
      .map((p, i) => ({
        id: `edge-${i}`,
        source: p.source,
        target: p.target,
        type: "smoothstep",
        animated: true,
        label: `${p.count} registos`,
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5, strokeDasharray: "6 3" },
        labelStyle: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
        labelBgStyle: { fill: "hsl(var(--background))", fillOpacity: 0.9 },
      }));

    return { nodes, edges };
  }, [customObjects, relPairs]);

  const loading = objLoading || relLoading;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Modelo de Dados</h1>
            <p className="text-sm text-muted-foreground">Visão geral dos objetos e relações</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs" asChild>
            <Link to="/settings/data-model">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Editar modelo
            </Link>
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesConnectable={false}
              elementsSelectable={false}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
