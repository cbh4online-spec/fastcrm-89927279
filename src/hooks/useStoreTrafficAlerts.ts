import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface TrafficAlertRule {
  id: string;
  workspace_id: string;
  metric_type: string;
  threshold_value: number;
  comparison_period_hours: number;
  comparison_type: string;
  is_active: boolean;
  notify_email: string | null;
  cooldown_hours: number;
  created_at: string;
  updated_at: string;
}

export interface TrafficAlertLog {
  id: string;
  workspace_id: string;
  rule_id: string;
  metric_type: string;
  metric_value: number;
  threshold_value: number;
  comparison_period_hours: number;
  message: string;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

export function useTrafficAlertRules() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["store-traffic-alert-rules", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_traffic_alert_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrafficAlertRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateTrafficAlertRule() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (rule: {
      metric_type: string;
      threshold_value: number;
      comparison_period_hours: number;
      comparison_type: string;
      notify_email?: string;
      cooldown_hours?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("store_traffic_alert_rules")
        .insert({
          workspace_id: currentWorkspace!.id,
          created_by: userData.user?.id,
          ...rule,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-traffic-alert-rules"] });
      toast.success("Regra de alerta criada");
    },
    onError: (e: Error) => toast.error("Erro ao criar regra: " + e.message),
  });
}

export function useUpdateTrafficAlertRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TrafficAlertRule> & { id: string }) => {
      const { error } = await supabase
        .from("store_traffic_alert_rules")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-traffic-alert-rules"] });
      toast.success("Regra actualizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteTrafficAlertRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_traffic_alert_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-traffic-alert-rules"] });
      toast.success("Regra eliminada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useTrafficAlertLogs(limit = 50) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["store-traffic-alerts-log", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_traffic_alerts_log")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as TrafficAlertLog[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60_000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_traffic_alerts_log")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-traffic-alerts-log"] });
    },
  });
}

export function useUnreadAlertCount() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["store-traffic-alerts-unread", currentWorkspace?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("store_traffic_alerts_log")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60_000,
  });
}
