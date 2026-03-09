import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useRevenueFlightSnapshot() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-snapshot", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await supabase
        .from("revenue_forecast_snapshots")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRevenueTarget() {
  const { currentWorkspace } = useWorkspace();
  const now = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["rfc-target", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await supabase
        .from("revenue_targets")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .lte("period_start", now)
        .gte("period_end", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useDealProbabilityScores() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-deal-scores", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("deal_probability_scores")
        .select("*, opportunities!inner(title, value, status, expected_close_date, last_activity_at, owner_id, company_id, stage_id, priority_level, companies(name), pipeline_stages(name))")
        .eq("workspace_id", currentWorkspace.id)
        .order("probability_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDealRiskSignals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-risk-signals", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("deal_risk_signals")
        .select("*, opportunities(title, value)")
        .eq("workspace_id", currentWorkspace.id)
        .is("resolved_at", null)
        .order("signal_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });
}

export function useRevenueRecommendations() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-recommendations", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("revenue_recommendations")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "pending")
        .order("impact_estimate", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });
}

export function useRevenueScenarios() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-scenarios", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("revenue_scenarios")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });
}

export function useRevenueModelConfig() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["rfc-model-config", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await supabase
        .from("revenue_model_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useRecomputeRevenueFlightControl() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("compute-revenue-flight-control", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfc-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["rfc-deal-scores"] });
      queryClient.invalidateQueries({ queryKey: ["rfc-risk-signals"] });
      queryClient.invalidateQueries({ queryKey: ["rfc-recommendations"] });
    },
  });
}

export function useRunScenario() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (params: { scenario_name: string; scenario_type: string; input_json: Record<string, any> }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("run-revenue-scenario", {
        body: { workspace_id: currentWorkspace.id, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfc-scenarios"] });
    },
  });
}

export function useSaveRevenueTarget() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (params: { target_revenue: number; target_deals: number; period_start: string; period_end: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("revenue_targets")
        .insert({
          workspace_id: currentWorkspace.id,
          ...params,
          period_type: "monthly",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfc-target"] });
    },
  });
}

export function useSaveModelConfig() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (params: Record<string, any>) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("revenue_model_config")
        .upsert({
          workspace_id: currentWorkspace.id,
          ...params,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfc-model-config"] });
    },
  });
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${Math.round(value).toLocaleString("pt-PT")}`;
}

export function getTargetStatus(probability: number): { label: string; color: string; bg: string } {
  if (probability >= 0.95) return { label: "On Track", color: "text-emerald-400", bg: "bg-emerald-500/20" };
  if (probability >= 0.7) return { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/20" };
  return { label: "Em Risco", color: "text-red-400", bg: "bg-red-500/20" };
}
