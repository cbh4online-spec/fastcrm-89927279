import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useBaselineForecast() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["forecast-baseline", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("forecast_runs" as any)
        .select("*")
        .eq("workspace_id", wid)
        .eq("run_type", "baseline")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!wid,
  });
}

export function useSimulationScenarios(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["simulation-scenarios", wid, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from("simulation_scenarios" as any)
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(20);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });
}

export function useRunSimulation() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { scenario_type?: string; inputs?: Record<string, number> }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("run-forecast-simulation", {
        body: { workspace_id: currentWorkspace.id, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const wid = currentWorkspace?.id;
      queryClient.invalidateQueries({ queryKey: ["forecast-baseline", wid] });
      queryClient.invalidateQueries({ queryKey: ["simulation-scenarios", wid] });
      toast.success("Simulação concluída");
    },
    onError: (err: Error) => {
      toast.error("Erro na simulação: " + err.message);
    },
  });
}

export function useForecastSettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["forecast-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("forecast_settings" as any)
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!wid) throw new Error("No workspace");
      const { data: existing } = await supabase
        .from("forecast_settings" as any)
        .select("id")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("forecast_settings" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("workspace_id", wid);
      } else {
        await supabase
          .from("forecast_settings" as any)
          .insert({ workspace_id: wid, ...updates } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast-settings", wid] });
      toast.success("Configurações guardadas");
    },
  });

  return { data: query.data, isLoading: query.isLoading, upsert };
}

export function useCompareScenarios(ids: string[]) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["compare-scenarios", wid, ids],
    queryFn: async () => {
      if (!wid || ids.length === 0) return [];
      const { data, error } = await supabase
        .from("simulation_scenarios" as any)
        .select("*")
        .eq("workspace_id", wid)
        .in("id", ids);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid && ids.length > 0,
  });
}
