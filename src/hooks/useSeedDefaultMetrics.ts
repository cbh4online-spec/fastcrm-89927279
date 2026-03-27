import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const sb = supabase as any;

const DEFAULT_METRICS = [
  {
    name: "Total de Leads",
    description: "Número total de leads criados no período",
    metric_type: "volume",
    formula: "count",
    source_table: "leads",
    source_field: null,
    filter_json: {},
    unit: "leads",
    icon: "Users",
    color: "#3B82F6",
    is_system: true,
  },
  {
    name: "Negócios Ganhos",
    description: "Número de negócios fechados com sucesso",
    metric_type: "volume",
    formula: "count",
    source_table: "leads",
    source_field: null,
    filter_json: { status: "won" },
    unit: "deals",
    icon: "Trophy",
    color: "#10B981",
    is_system: true,
  },
  {
    name: "Revenue Total",
    description: "Soma do valor dos negócios ganhos",
    metric_type: "value",
    formula: "sum",
    source_table: "leads",
    source_field: "deal_value",
    filter_json: { status: "won" },
    unit: "€",
    icon: "DollarSign",
    color: "#F59E0B",
    is_system: true,
  },
  {
    name: "Reuniões Agendadas",
    description: "Número de reuniões criadas no período",
    metric_type: "volume",
    formula: "count",
    source_table: "meetings",
    source_field: null,
    filter_json: {},
    unit: "reuniões",
    icon: "Calendar",
    color: "#8B5CF6",
    is_system: true,
  },
  {
    name: "Propostas Enviadas",
    description: "Número de propostas criadas no período",
    metric_type: "volume",
    formula: "count",
    source_table: "proposals",
    source_field: null,
    filter_json: {},
    unit: "propostas",
    icon: "FileText",
    color: "#EC4899",
    is_system: true,
  },
  {
    name: "Tarefas Completas",
    description: "Número de tarefas concluídas no período",
    metric_type: "volume",
    formula: "count",
    source_table: "tasks",
    source_field: null,
    filter_json: { status: "completed" },
    unit: "tarefas",
    icon: "CheckCircle",
    color: "#06B6D4",
    is_system: true,
  },
];

export function useSeedDefaultMetrics() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const seeding = useRef(false);
  const wid = currentWorkspace?.id;

  useEffect(() => {
    if (!wid || !user?.id || seeding.current) return;

    const run = async () => {
      // Check if metrics already exist
      const { count } = await sb
        .from("pipeline_metrics")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wid)
        .eq("is_active", true);

      if (count && count > 0) return;

      seeding.current = true;

      const rows = DEFAULT_METRICS.map((m) => ({
        ...m,
        workspace_id: wid,
        created_by: user.id,
        is_active: true,
      }));

      const { error } = await sb.from("pipeline_metrics").insert(rows);
      if (error) {
        console.error("[SEED] Failed to seed default metrics:", error);
        seeding.current = false;
        return;
      }

      // Invalidate queries to refresh the UI
      qc.invalidateQueries({ queryKey: ["pipeline-metrics", wid] });
      qc.invalidateQueries({ queryKey: ["calculated-metrics", wid] });
    };

    run();
  }, [wid, user?.id]);
}
