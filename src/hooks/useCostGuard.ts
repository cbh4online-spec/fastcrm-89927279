import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useCostGuardSummary(month?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["cost-guard-summary", workspaceId, month],
    enabled: !!workspaceId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cost-guard-summary", {
        body: { workspace_id: workspaceId, month },
      });
      if (error) throw error;
      return data as {
        total_cost: number; total_billable: number; total_margin: number; currency: string;
        by_module: Array<{ module: string; quantity: number; cost: number; billable: number; margin: number }>;
        by_usage_type: any[]; limits: any[]; alerts: any[]; daily: any[]; month: string;
      };
    },
  });
}

export function useCostGuardEvents(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["cost-guard-events", workspaceId, limit],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_guard_events" as any)
        .select("*").eq("workspace_id", workspaceId!)
        .order("occurred_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCostGuardLimits() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["cost-guard-limits", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_guard_limits" as any)
        .select("*").eq("workspace_id", workspaceId!).order("usage_type");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCostGuardRates() {
  return useQuery({
    queryKey: ["cost-guard-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_guard_rates" as any)
        .select("*").eq("active", true).order("source_module");
      if (error) throw error;
      return data || [];
    },
  });
}
