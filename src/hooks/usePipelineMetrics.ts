import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const sb = supabase as any;

export type MetricType = "volume" | "value" | "conversion" | "time" | "quality" | "custom";
export type MetricFormula = "count" | "sum" | "avg" | "percentage" | "duration" | "event_count";
export type MetricPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type AlertChannel = "in_app" | "email" | "webhook";

export interface PipelineMetric {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  metric_type: MetricType;
  formula: MetricFormula;
  source_table: string;
  source_field: string | null;
  filter_json: Record<string, unknown>;
  unit: string;
  icon: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface MetricTarget {
  id: string;
  workspace_id: string;
  metric_id: string;
  period: MetricPeriod;
  target_value: number;
  pipeline_id: string | null;
  stage_id: string | null;
  team_id: string | null;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MetricSnapshot {
  id: string;
  metric_id: string;
  period: MetricPeriod;
  period_start: string;
  period_end: string;
  current_value: number;
  target_value: number | null;
  previous_value: number | null;
  pct_of_target: number | null;
  pct_change: number | null;
  breakdown_json: Record<string, unknown>;
  calculated_at: string;
}

export interface MetricAlert {
  id: string;
  metric_id: string;
  target_id: string | null;
  channel: AlertChannel;
  condition: string;
  threshold_pct: number;
  webhook_url: string | null;
  recipient_user_ids: string[];
  is_active: boolean;
  last_triggered_at: string | null;
}

export function usePipelineMetrics() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const metricsQuery = useQuery({
    queryKey: ["pipeline-metrics", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("pipeline_metrics").select("*").eq("workspace_id", wid).eq("is_active", true).order("created_at");
      if (error) throw error;
      return data as PipelineMetric[];
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  const targetsQuery = useQuery({
    queryKey: ["pipeline-metric-targets", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("pipeline_metric_targets").select("*").eq("workspace_id", wid).eq("is_active", true).order("created_at");
      if (error) throw error;
      return data as MetricTarget[];
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  const alertsQuery = useQuery({
    queryKey: ["pipeline-metric-alerts", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("pipeline_metric_alerts").select("*").eq("workspace_id", wid).eq("is_active", true).order("created_at");
      if (error) throw error;
      return data as MetricAlert[];
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  const createMetric = useMutation({
    mutationFn: async (metric: Partial<PipelineMetric>) => {
      const { data, error } = await sb.from("pipeline_metrics").insert({ ...metric, workspace_id: wid, created_by: user?.id }).select().single();
      if (error) throw error;
      return data as PipelineMetric;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-metrics", wid] }); toast.success("Métrica criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMetric = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineMetric> & { id: string }) => {
      const { data, error } = await sb.from("pipeline_metrics").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data as PipelineMetric;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-metrics", wid] }); toast.success("Métrica atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMetric = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("pipeline_metrics").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-metrics", wid] }); toast.success("Métrica removida"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTarget = useMutation({
    mutationFn: async (target: Partial<MetricTarget>) => {
      const { data, error } = await sb.from("pipeline_metric_targets").insert({ ...target, workspace_id: wid, created_by: user?.id }).select().single();
      if (error) throw error;
      return data as MetricTarget;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-metric-targets", wid] }); toast.success("Meta criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAlert = useMutation({
    mutationFn: async (alert: Partial<MetricAlert> & { metric_id: string }) => {
      const { data, error } = await sb.from("pipeline_metric_alerts").insert({ ...alert, workspace_id: wid, created_by: user?.id }).select().single();
      if (error) throw error;
      return data as MetricAlert;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-metric-alerts", wid] }); toast.success("Alerta criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    metrics: metricsQuery.data ?? [],
    metricsLoading: metricsQuery.isLoading,
    targets: targetsQuery.data ?? [],
    targetsLoading: targetsQuery.isLoading,
    alerts: alertsQuery.data ?? [],
    alertsLoading: alertsQuery.isLoading,
    createMetric,
    updateMetric,
    deleteMetric,
    createTarget,
    createAlert,
  };
}
