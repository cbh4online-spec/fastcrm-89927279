import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface UsageCounter {
  metric_key: string;
  units_used: number;
  units_limit: number;
  reset_at: string | null;
}

export interface PlanLimit {
  metric_key: string;
  limit_value: number;
  billing_mode: string;
}

const METRIC_LABELS: Record<string, string> = {
  active_accounts: "Contas ativas",
  initial_analyses_month: "Análises iniciais / mês",
  reanalyses_month: "Reanálises / mês",
  watchlist_accounts: "Contas em watchlist",
  pdf_exports_month: "Exports PDF / mês",
  outreach_generations_month: "Gerações de outreach / mês",
  batch_actions_month: "Ações batch / mês",
  enrichment_runs_month: "Enriquecimentos / mês",
  max_accounts_per_segment: "Contas por segmento",
  comparisons_month: "Comparações / mês",
};

export function getMetricLabel(key: string) {
  return METRIC_LABELS[key] || key;
}

export function getUsagePercentage(used: number, limit: number) {
  if (limit <= 0 || limit >= 99999) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function getUsageStatus(pct: number): "ok" | "warning" | "danger" | "blocked" {
  if (pct >= 100) return "blocked";
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warning";
  return "ok";
}

export function useAccountBriefUsage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: counters = [], isLoading: countersLoading } = useQuery({
    queryKey: ["account-brief-usage-counters", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_usage_counters")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("period_key", currentPeriod);
      if (error) throw error;
      return (data || []) as UsageCounter[];
    },
    enabled: !!workspaceId,
  });

  const { data: planLimits = [], isLoading: limitsLoading } = useQuery({
    queryKey: ["account-brief-plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_brief_plan_limits")
        .select("*")
        .eq("plan_code", "starter"); // TODO: resolve from workspace plan
      if (error) throw error;
      return (data || []) as PlanLimit[];
    },
  });

  const getCounter = (metricKey: string): UsageCounter => {
    const found = counters.find((c) => c.metric_key === metricKey);
    const limit = planLimits.find((l) => l.metric_key === metricKey);
    return {
      metric_key: metricKey,
      units_used: found?.units_used || 0,
      units_limit: found?.units_limit || limit?.limit_value || 0,
      reset_at: found?.reset_at || null,
    };
  };

  const checkQuota = (metricKey: string, unitsNeeded: number = 1): { allowed: boolean; remaining: number } => {
    const counter = getCounter(metricKey);
    if (counter.units_limit >= 99999) return { allowed: true, remaining: 99999 };
    const remaining = Math.max(0, counter.units_limit - counter.units_used);
    return { allowed: remaining >= unitsNeeded, remaining };
  };

  const recordUsage = useMutation({
    mutationFn: async ({ metricKey, units = 1, accountId, sourceAction }: {
      metricKey: string; units?: number; accountId?: string; sourceAction?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      // Upsert counter
      const { error: counterError } = await supabase
        .from("account_brief_usage_counters")
        .upsert({
          workspace_id: workspaceId,
          period_key: currentPeriod,
          metric_key: metricKey,
          units_used: (getCounter(metricKey).units_used || 0) + units,
          units_limit: getCounter(metricKey).units_limit,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,period_key,metric_key" });
      if (counterError) throw counterError;
      // Log event
      await supabase.from("account_brief_usage_events").insert({
        workspace_id: workspaceId,
        account_id: accountId || null,
        event_type: "consumption",
        metric_key: metricKey,
        units_consumed: units,
        source_action: sourceAction || metricKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-usage-counters"] });
    },
  });

  const allMetrics = Object.keys(METRIC_LABELS).map((key) => {
    const counter = getCounter(key);
    const pct = getUsagePercentage(counter.units_used, counter.units_limit);
    return { ...counter, label: getMetricLabel(key), percentage: pct, status: getUsageStatus(pct) };
  });

  return {
    counters,
    planLimits,
    isLoading: countersLoading || limitsLoading,
    getCounter,
    checkQuota,
    recordUsage,
    allMetrics,
    currentPeriod,
  };
}
