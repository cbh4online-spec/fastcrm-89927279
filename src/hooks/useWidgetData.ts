import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ReportWidget } from "./useReportWidgets";
import { format, startOfWeek, startOfQuarter, subQuarters } from "date-fns";

export interface WidgetDataPoint {
  label: string;
  value: number;
  group?: string;
}

async function fetchDatasetRows(dataset: string, workspaceId: string, filters: Record<string, any>, globalFilters?: { dateFrom?: string; dateTo?: string }) {
  const applyFilters = (q: any) => {
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.date_range === "current_quarter") {
      q = q.gte("created_at", startOfQuarter(new Date()).toISOString());
    } else if (filters.date_range === "last_quarter") {
      const lastQ = subQuarters(new Date(), 1);
      q = q.gte("created_at", startOfQuarter(lastQ).toISOString()).lt("created_at", startOfQuarter(new Date()).toISOString());
    }
    if (globalFilters?.dateFrom) q = q.gte("created_at", globalFilters.dateFrom);
    if (globalFilters?.dateTo) q = q.lte("created_at", globalFilters.dateTo);
    return q;
  };

  let result: { data: any[] | null; error: any };
  switch (dataset) {
    case "deals": result = await applyFilters(supabase.from("opportunities").select("*").eq("workspace_id", workspaceId)); break;
    case "leads": result = await applyFilters(supabase.from("leads").select("*").eq("workspace_id", workspaceId)); break;
    case "companies": result = await applyFilters(supabase.from("companies").select("*").eq("workspace_id", workspaceId)); break;
    case "people": result = await applyFilters(supabase.from("contacts").select("*").eq("workspace_id", workspaceId)); break;
    default: result = await applyFilters(supabase.from("opportunities").select("*").eq("workspace_id", workspaceId)); break;
  }
  if (result.error) throw result.error;
  return result.data || [];
}

export function useWidgetData(widget: ReportWidget | null, globalFilters?: { dateFrom?: string; dateTo?: string }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["widget-data", widget?.id, widget?.filters, globalFilters],
    queryFn: async (): Promise<WidgetDataPoint[]> => {
      if (!widget || !currentWorkspace) return [];
      const rows = await fetchDatasetRows(widget.dataset, currentWorkspace.id, widget.filters || {}, globalFilters);
      if (rows.length === 0) return [];
      return aggregateData(rows, widget);
    },
    enabled: !!widget && !!currentWorkspace,
    staleTime: 60_000,
  });
}

function aggregateData(rows: any[], widget: ReportWidget): WidgetDataPoint[] {
  const { metric, value_field, group_by, chart_type } = widget;

  // Group rows
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = getGroupKey(row, group_by);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // For funnel, use stage ordering
  if (chart_type === "funnel") {
    return buildFunnelData(rows, group_by);
  }

  // For stacked bars, we need secondary grouping
  if (chart_type === "bar_stacked") {
    return buildStackedData(rows, group_by, metric, value_field);
  }

  // Simple aggregation
  const result: WidgetDataPoint[] = [];
  const sortedKeys = [...groups.keys()].sort();
  for (const key of sortedKeys) {
    const groupRows = groups.get(key)!;
    const value = computeMetric(groupRows, metric, value_field);
    result.push({ label: key, value });
  }
  return result;
}

function getGroupKey(row: any, groupBy: string): string {
  switch (groupBy) {
    case "month":
      return row.created_at ? format(new Date(row.created_at), "yyyy-MM") : "N/A";
    case "week":
      return row.created_at ? format(startOfWeek(new Date(row.created_at), { weekStartsOn: 1 }), "dd/MM") : "N/A";
    case "source":
      return row.source || row.lead_source || "Outros";
    case "stage":
      return row.stage || row.pipeline_stage || "N/A";
    case "owner":
      return row.assigned_to || row.owner_id || "Sem dono";
    default:
      return "Total";
  }
}

function computeMetric(rows: any[], metric: string, valueField: string | null): number {
  if (metric === "count") return rows.length;
  if (!valueField) return rows.length;
  
  const values = rows.map(r => Number(r[valueField]) || 0);
  if (metric === "sum") return values.reduce((a, b) => a + b, 0);
  if (metric === "avg") return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return rows.length;
}

function buildFunnelData(rows: any[], groupBy: string): WidgetDataPoint[] {
  const stageOrder = ["contacted", "qualification", "evaluation", "negotiation", "closed_won"];
  const stageCounts = new Map<string, number>();
  
  for (const row of rows) {
    const stage = (row.stage || row.pipeline_stage || "").toLowerCase().replace(/[\s-]/g, "_");
    const idx = stageOrder.indexOf(stage);
    // Count this row for its stage and all previous stages
    for (let i = 0; i <= Math.max(idx, 0); i++) {
      // For funnel we count each stage independently
    }
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  }

  // Build cumulative funnel
  let total = rows.length;
  return stageOrder.map(stage => {
    const count = stageCounts.get(stage) || 0;
    return { label: stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), value: count };
  });
}

function buildStackedData(rows: any[], groupBy: string, metric: string, valueField: string | null): WidgetDataPoint[] {
  // Group by primary key (e.g. week) + secondary (source)
  const result: WidgetDataPoint[] = [];
  const primaryGroups = new Map<string, any[]>();
  
  for (const row of rows) {
    const key = getGroupKey(row, groupBy === "week" ? "week" : "month");
    if (!primaryGroups.has(key)) primaryGroups.set(key, []);
    primaryGroups.get(key)!.push(row);
  }

  for (const [label, groupRows] of [...primaryGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // Sub-group by source
    const subGroups = new Map<string, any[]>();
    for (const row of groupRows) {
      const src = row.source || row.lead_source || "Outros";
      if (!subGroups.has(src)) subGroups.set(src, []);
      subGroups.get(src)!.push(row);
    }
    for (const [group, subRows] of subGroups) {
      result.push({ label, value: computeMetric(subRows, metric, valueField), group });
    }
  }
  return result;
}
