import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { KPI_SNAPSHOTS_SELECT_COLUMNS } from "@/hooks/constants/selectColumns";

export interface ABKpiSnapshot {
  metric_key: string;
  metric_value: number;
  snapshot_date: string;
}

const KPI_KEYS = [
  "total_accounts",
  "active_accounts",
  "high_score_accounts",
  "watchlist_accounts",
  "analysis_success_rate",
  "analysis_failure_rate",
  "avg_time_to_first_brief_hours",
  "outreach_generated",
  "pdf_exports",
  "crm_linked_accounts",
  "owned_accounts",
  "high_confidence_accounts",
  "alerts_generated",
  "segments_count",
] as const;

export type ABKpiKey = (typeof KPI_KEYS)[number];

export function useAccountBriefKPIs() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const latestQuery = useQuery({
    queryKey: ["account-brief-kpis-latest", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_kpi_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("snapshot_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      // Get latest value per metric_key
      const map = new Map<string, ABKpiSnapshot>();
      for (const row of data || []) {
        if (!map.has(row.metric_key)) {
          map.set(row.metric_key, row);
        }
      }
      return Array.from(map.values());
    },
    enabled: !!workspaceId,
  });

  const trendQuery = useQuery({
    queryKey: ["account-brief-kpis-trend", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from("account_brief_kpi_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const getKpi = (key: string): number => {
    const found = latestQuery.data?.find((s) => s.metric_key === key);
    return found?.metric_value ?? 0;
  };

  const getTrend = (key: string): ABKpiSnapshot[] => {
    return trendQuery.data?.filter((s) => s.metric_key === key) || [];
  };

  return {
    kpis: latestQuery.data || [],
    trends: trendQuery.data || [],
    getKpi,
    getTrend,
    isLoading: latestQuery.isLoading,
    KPI_KEYS,
  };
}

export const KPI_LABELS: Record<string, string> = {
  total_accounts: "Total de Contas",
  active_accounts: "Contas Ativas",
  high_score_accounts: "Score Alto+",
  watchlist_accounts: "Em Watchlist",
  analysis_success_rate: "Taxa de Sucesso (%)",
  analysis_failure_rate: "Taxa de Falha (%)",
  avg_time_to_first_brief_hours: "Tempo Médio 1º Brief (h)",
  outreach_generated: "Outreach Gerados",
  pdf_exports: "Exports PDF",
  crm_linked_accounts: "Ligadas ao CRM",
  owned_accounts: "Com Owner",
  high_confidence_accounts: "Alta Confiança",
  alerts_generated: "Alertas Gerados",
  segments_count: "Segmentos",
};
