import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface RevenueForecast {
  id: string;
  workspace_id: string;
  generated_at: string;
  forecast_7: number;
  forecast_30: number;
  forecast_90: number;
  best_case: number;
  expected_case: number;
  worst_case: number;
  risk_index: number;
  confidence_avg: number;
  opportunity_count: number;
  hot_count: number;
  likely_count: number;
  uncertain_count: number;
  low_count: number;
  created_at: string;
  // V2 fields
  stage_weighted: number;
  healthy_revenue: number;
  watch_revenue: number;
  at_risk_revenue: number;
  blockers: string[];
  health_adjusted_expected: number;
  pipeline_health_avg: number;
  forecast_confidence: number;
}

export function useRevenueForecast() {
  const { currentWorkspace } = useWorkspace();

  const { data, isLoading, error } = useQuery({
    queryKey: ["revenue-forecast", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("revenue_forecasts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("generated_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      return (data || []) as RevenueForecast[];
    },
    enabled: !!currentWorkspace,
    staleTime: 5 * 60 * 1000,
  });

  const latest = data?.[0] ?? null;
  const previous = data?.[1] ?? null;

  let trend: number | null = null;
  if (latest && previous && previous.expected_case > 0) {
    trend = Math.round(
      ((latest.expected_case - previous.expected_case) / previous.expected_case) * 1000
    ) / 10;
  }

  return { latestForecast: latest, previousForecast: previous, trend, isLoading, error };
}

export function useGenerateRevenueForecast() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("compute-revenue-forecast", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data as RevenueForecast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue-forecast", currentWorkspace?.id] });
    },
  });
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}
