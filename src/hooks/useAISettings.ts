import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type {
  AISettings,
  AIUsageDashboardData,
  AIDailyTrend,
  AIUsageSummaryRow,
  AIUsageLog,
} from "@/types/ai-settings";

export function useAISettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ai-settings", workspaceId],
    queryFn: async (): Promise<AISettings | null> => {
      const { data } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      return (data as unknown as AISettings) ?? null;
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useUpdateAISettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (updates: Partial<AISettings>) => {
      const { data, error } = await supabase
        .from("ai_settings")
        .upsert({ ...updates, workspace_id: workspaceId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AISettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-settings", workspaceId] }),
  });
}

export function useAIUsageDashboard(
  period: "7d" | "30d" | "90d" = "30d"
): { data: AIUsageDashboardData | null; isLoading: boolean } {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period];
  const fromDate = new Date(Date.now() - days * 86400000).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage-dashboard", workspaceId, period],
    queryFn: async (): Promise<AIUsageDashboardData> => {
      const [summaryResult, trendResult, settingsResult] = await Promise.all([
        supabase.rpc("get_ai_usage_summary", {
          p_workspace_id: workspaceId!,
          p_from: fromDate,
        }),
        supabase.rpc("get_ai_daily_trend", {
          p_workspace_id: workspaceId!,
          p_days: days,
        }),
        supabase
          .from("ai_settings")
          .select("monthly_token_budget, current_month_tokens, current_month_cost_usd")
          .eq("workspace_id", workspaceId!)
          .maybeSingle(),
      ]);

      const summary: AIUsageSummaryRow[] = (summaryResult.data as any) ?? [];
      const trend: AIDailyTrend[] = (trendResult.data as any) ?? [];
      const settings = settingsResult.data as any;

      const totalTokens = summary.reduce((s, r) => s + Number(r.tokens_total), 0);
      const totalCost = summary.reduce((s, r) => s + Number(r.cost_usd_total), 0);
      const totalCalls = summary.reduce((s, r) => s + Number(r.call_count), 0);
      const totalErrors = summary.reduce((s, r) => s + Number(r.error_count), 0);
      const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;

      const budget = Number(settings?.monthly_token_budget ?? 0);
      const budgetUsed =
        budget > 0 && settings
          ? Math.round((Number(settings.current_month_tokens) / budget) * 100)
          : null;

      return {
        summary_by_feature: summary,
        daily_trend: trend,
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        total_calls: totalCalls,
        error_rate: errorRate,
        budget_used_percent: budgetUsed,
      };
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  });

  return { data: data ?? null, isLoading };
}

export function useRecentAILogs(limit = 50) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ai-usage-logs", workspaceId, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as unknown as AIUsageLog[]) ?? [];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
