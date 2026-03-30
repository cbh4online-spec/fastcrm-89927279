import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export function useStrategicState() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["strategic-state", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("strategic_state_snapshots" as any)
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!wid,
  });
}

export function useStrategicHypotheses(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["strategic-hypotheses", wid, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from("strategic_hypotheses" as any)
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });
}

export function useStrategicRecommendations(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["strategic-recommendations", wid, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from("strategic_recommendations" as any)
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });
}

export function useStrategySettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["strategy-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("strategy_settings" as any)
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
        .from("strategy_settings" as any)
        .select("id")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("strategy_settings" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("workspace_id", wid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("strategy_settings" as any)
          .insert({ workspace_id: wid, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-settings", wid] });
      toast.success("Definições de estratégia guardadas");
    },
  });

  return { settings: query.data, isLoading: query.isLoading, upsert };
}

export function useRefreshStrategy() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.id;

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("process-strategy-layer", {
        body: { workspace_id: wid },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategic-state", wid] });
      queryClient.invalidateQueries({ queryKey: ["strategic-hypotheses", wid] });
      queryClient.invalidateQueries({ queryKey: ["strategic-recommendations", wid] });
      toast.success("Estratégia atualizada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar estratégia: " + err.message);
    },
  });
}

export function useActOnRecommendation() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ recommendationId, action }: { recommendationId: string; action: "accepted" | "acted" | "dismissed" }) => {
      if (!wid) throw new Error("No workspace");
      const { error } = await supabase
        .from("strategic_recommendations" as any)
        .update({
          status: action,
          updated_at: new Date().toISOString(),
          ...(action === "acted" ? { acted_at: new Date().toISOString() } : {}),
        } as any)
        .eq("id", recommendationId);
      if (error) throw error;

      if (action === "acted") {
        emitKernelEvent({
          workspace_id: wid,
          type: "STRATEGY.RECOMMENDATION_ACTED",
          entity_kind: "strategic_recommendation",
          entity_id: recommendationId,
          source_module: "strategy-layer",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategic-recommendations", wid] });
      toast.success("Recomendação atualizada");
    },
  });
}

export function useStrategyHistory(limit = 10) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["strategy-history", wid, limit],
    queryFn: async () => {
      if (!wid) return [];
      const { data, error } = await supabase
        .from("strategic_state_snapshots" as any)
        .select("id, strategic_health_score, growth_mode, bottleneck_type, strategic_focus, confidence, created_at")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!wid,
  });
}
