import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ChartItem { name: string; value: number }
interface MaintenanceItem { month: string; scheduled: number; completed: number }

export function useSecurityDashboardCharts() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: charts, isLoading } = useQuery({
    queryKey: ["security-dashboard-charts", wsId],
    queryFn: async () => {
      if (!wsId) return defaultCharts();

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [occRes, sysRes, contRes, docsRes, visitsRes] = await Promise.all([
        supabase.from("security_occurrences").select("severity").eq("workspace_id", wsId),
        supabase.from("security_systems").select("system_type").eq("workspace_id", wsId),
        supabase.from("security_contracts").select("contract_status").eq("workspace_id", wsId),
        supabase.from("security_documents").select("status").eq("workspace_id", wsId),
        supabase.from("security_maintenance_visits")
          .select("visit_status, scheduled_at")
          .eq("workspace_id", wsId)
          .gte("scheduled_at", sixMonthsAgo.toISOString()),
      ]);

      return {
        occurrencesBySeverity: groupBy(occRes.data ?? [], "severity"),
        systemsByType: groupBy(sysRes.data ?? [], "system_type"),
        contractsByStatus: groupBy(contRes.data ?? [], "contract_status"),
        documentsByStatus: groupBy(docsRes.data ?? [], "status"),
        maintenanceCompliance: computeMaintenanceCompliance(visitsRes.data ?? []),
      };
    },
    enabled: !!wsId,
  });

  return { charts: charts ?? defaultCharts(), isLoading };
}

function defaultCharts() {
  return {
    occurrencesBySeverity: [] as ChartItem[],
    systemsByType: [] as ChartItem[],
    contractsByStatus: [] as ChartItem[],
    documentsByStatus: [] as ChartItem[],
    maintenanceCompliance: [] as MaintenanceItem[],
  };
}

function groupBy(items: any[], key: string): ChartItem[] {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const val = item[key] ?? "unknown";
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function computeMaintenanceCompliance(visits: any[]): MaintenanceItem[] {
  const months: Record<string, { scheduled: number; completed: number }> = {};
  visits.forEach((v) => {
    if (!v.scheduled_at) return;
    const d = new Date(v.scheduled_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { scheduled: 0, completed: 0 };
    months[key].scheduled++;
    if (v.visit_status === "completed") months[key].completed++;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
