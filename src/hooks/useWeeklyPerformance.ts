import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type MetricStatus = "green" | "yellow" | "red";

export interface WeeklyMetric {
  key: string;
  label: string;
  actual: number;
  target: number;
  pct: number;
  status: MetricStatus;
  format: "number" | "currency";
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString(), end: sunday.toISOString(), startDate: monday.toISOString().split("T")[0] };
}

function statusFromPct(pct: number): MetricStatus {
  if (pct >= 80) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}

export function useWeeklyPerformance() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["weekly-performance", wid],
    enabled: !!wid,
    refetchInterval: 60_000,
    queryFn: async (): Promise<{ metrics: WeeklyMetric[]; pipelineValue: number; pipelineCoverage: number; weekLabel: string }> => {
      const { start, end, startDate } = getWeekBounds();

      // Targets
      const { data: targets } = await supabase
        .from("performance_targets")
        .select("*")
        .eq("workspace_id", wid!)
        .eq("period_type", "weekly")
        .lte("period_start", startDate)
        .gte("period_end", startDate);

      const tMap: Record<string, number> = {};
      (targets || []).forEach((t: any) => { tMap[t.metric_type] = Number(t.target_value); });

      // Actuals
      const [leadsRes, meetingsRes, proposalsRes, oppsRes, pipelineRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!).gte("created_at", start).lte("created_at", end),
        supabase.from("meetings").select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!).gte("created_at", start).lte("created_at", end),
        supabase.from("proposals").select("id", { count: "exact", head: true })
          .eq("workspace_id", wid!).eq("status", "published").gte("created_at", start).lte("created_at", end),
        supabase.from("opportunities").select("id, value, status, updated_at")
          .eq("workspace_id", wid!).eq("status", "won").gte("updated_at", start).lte("updated_at", end),
        supabase.from("opportunities").select("id, value")
          .eq("workspace_id", wid!).in("status", ["open", "active", "negotiation"]),
      ]);

      const wonDeals = oppsRes.data || [];
      const revenue = wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
      const pipelineValue = (pipelineRes.data || []).reduce((s: number, d: any) => s + (d.value || 0), 0);
      const revenueTarget = tMap.revenue || 0;
      const pipelineCoverage = revenueTarget > 0 ? pipelineValue / revenueTarget : 0;

      const raw: { key: string; label: string; actual: number; target: number; format: "number" | "currency" }[] = [
        { key: "revenue", label: "Receita", actual: revenue, target: revenueTarget, format: "currency" },
        { key: "deals", label: "Deals Fechados", actual: wonDeals.length, target: tMap.deals || 0, format: "number" },
        { key: "pipeline", label: "Pipeline Coverage", actual: Math.round(pipelineCoverage * 100) / 100, target: 3, format: "number" },
        { key: "meetings", label: "Reuniões", actual: meetingsRes.count || 0, target: tMap.meetings || 0, format: "number" },
        { key: "leads", label: "Leads Gerados", actual: leadsRes.count || 0, target: tMap.leads || 0, format: "number" },
        { key: "proposals", label: "Propostas Enviadas", actual: proposalsRes.count || 0, target: tMap.proposals || 0, format: "number" },
      ];

      const metrics: WeeklyMetric[] = raw.map((m) => {
        const pct = m.target > 0 ? Math.round((m.actual / m.target) * 100) : (m.actual > 0 ? 100 : 0);
        return { ...m, pct, status: statusFromPct(pct) };
      });

      const mondayDate = new Date(start);
      const sundayDate = new Date(end);
      const weekLabel = `${mondayDate.getDate()}/${mondayDate.getMonth() + 1} — ${sundayDate.getDate()}/${sundayDate.getMonth() + 1}`;

      return { metrics, pipelineValue, pipelineCoverage, weekLabel };
    },
  });
}
