import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface PortfolioEntity {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  category: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioMetric {
  id: string;
  workspace_id: string;
  portfolio_entity_id: string;
  revenue_actual: number;
  revenue_forecast: number;
  contribution_margin_estimate: number;
  conversion_rate: number;
  ltv_estimate: number;
  workload_cost_estimate: number;
  automation_leverage_score: number;
  risk_score: number;
  strategic_fit_score: number;
  capital_efficiency_score: number;
  allocation_recommendation: string;
  confidence: number;
  updated_at: string;
}

export interface PortfolioRecommendation {
  id: string;
  workspace_id: string;
  portfolio_entity_id: string | null;
  recommendation_type: string;
  title: string;
  rationale: string | null;
  expected_impact: string | null;
  confidence: number;
  priority: string;
  status: string;
  created_at: string;
  acted_at: string | null;
}

export interface PortfolioSettings {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  risk_weight: number;
  revenue_weight: number;
  effort_weight: number;
  automation_weight: number;
  strategy_weight: number;
}

export type EntityWithMetrics = PortfolioEntity & { metrics: PortfolioMetric | null };

export function usePortfolioEntities(typeFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["portfolio-entities", workspaceId, typeFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = supabase
        .from("portfolio_entities" as any)
        .select("*, portfolio_metrics(*)")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      if (typeFilter) q = q.eq("entity_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        metrics: Array.isArray(e.portfolio_metrics) ? e.portfolio_metrics[0] || null : e.portfolio_metrics || null,
      })) as EntityWithMetrics[];
    },
    enabled: !!workspaceId,
  });
}

export function usePortfolioTopAssets(limit = 5) {
  const { data: entities, ...rest } = usePortfolioEntities();
  const sorted = (entities || [])
    .filter((e) => e.metrics)
    .sort((a, b) => (b.metrics?.capital_efficiency_score ?? 0) - (a.metrics?.capital_efficiency_score ?? 0))
    .slice(0, limit);
  return { data: sorted, ...rest };
}

export function usePortfolioWeakest(limit = 5) {
  const { data: entities, ...rest } = usePortfolioEntities();
  const sorted = (entities || [])
    .filter((e) => e.metrics)
    .sort((a, b) => (a.metrics?.capital_efficiency_score ?? 0) - (b.metrics?.capital_efficiency_score ?? 0))
    .slice(0, limit);
  return { data: sorted, ...rest };
}

export function usePortfolioRecommendations(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["portfolio-recommendations", workspaceId, statusFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = supabase
        .from("portfolio_recommendations" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PortfolioRecommendation[];
    },
    enabled: !!workspaceId,
  });
}

export function usePortfolioSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["portfolio-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("portfolio_settings" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PortfolioSettings | null;
    },
    enabled: !!workspaceId,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<PortfolioSettings>) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: existing } = await supabase
        .from("portfolio_settings" as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("portfolio_settings" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_settings" as any)
          .insert({ workspace_id: workspaceId, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-settings", workspaceId] });
      toast.success("Definições de portfolio guardadas");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return { data: query.data, isLoading: query.isLoading, upsert };
}

export function useRefreshPortfolio() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("process-portfolio-allocation", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-entities"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-recommendations"] });
      toast.success(`Portfolio atualizado: ${data?.entities_count || 0} entidades, ${data?.recommendations_count || 0} recomendações`);
    },
    onError: (err: Error) => toast.error("Erro ao atualizar portfolio: " + err.message),
  });
}

export function useActOnPortfolioRecommendation() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accepted" | "acted" | "dismissed" }) => {
      const { error } = await supabase
        .from("portfolio_recommendations" as any)
        .update({
          status: action,
          acted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-recommendations", workspaceId] });
      toast.success("Recomendação atualizada");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}
