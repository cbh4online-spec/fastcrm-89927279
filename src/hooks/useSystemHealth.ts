import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useSystemHealth() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const modulesQuery = useQuery({
    queryKey: ["system-health-modules", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("feature_registry_runtime")
        .select("*")
        .eq("workspace_id", wsId)
        .order("module_id");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const smokeRunsQuery = useQuery({
    queryKey: ["system-health-smoke-runs", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("system_smoke_test_runs")
        .select("*")
        .eq("workspace_id", wsId)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const smokeFailuresQuery = useQuery({
    queryKey: ["system-health-smoke-failures", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("system_smoke_test_failures")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  // Deadletter count
  const deadletterQuery = useQuery({
    queryKey: ["system-health-deadletter", wsId],
    queryFn: async () => {
      if (!wsId) return 0;
      const { count, error } = await supabase
        .from("kernel_event_deadletter")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!wsId,
  });

  // Consumer status from kernel_event_state
  const consumerStatusQuery = useQuery({
    queryKey: ["system-health-consumers", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase
        .from("kernel_event_state")
        .select("*")
        .eq("workspace_id", wsId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });

  const runSmokeTests = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-run-smoke-tests", {
        body: { workspace_id: wsId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-health-smoke-runs"] });
      queryClient.invalidateQueries({ queryKey: ["system-health-smoke-failures"] });
    },
  });

  const recomputeHealth = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-module-health", {
        body: { workspace_id: wsId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-health-modules"] });
    },
  });

  // Compute overall health score
  const modules = modulesQuery.data ?? [];
  const healthScore = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + (Number(m.success_rate) || 0), 0) / modules.length)
    : null;

  return {
    modules,
    smokeRuns: smokeRunsQuery.data ?? [],
    smokeFailures: smokeFailuresQuery.data ?? [],
    deadletterCount: deadletterQuery.data ?? 0,
    consumerStatus: consumerStatusQuery.data ?? [],
    healthScore,
    isLoading: modulesQuery.isLoading,
    runSmokeTests,
    recomputeHealth,
  };
}
