import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ThrottleSettings {
  id: string;
  workspace_id: string;
  instance_id: string | null;
  max_per_day: number;
  min_interval_seconds: number;
  max_interval_seconds: number;
  error_pause_threshold: number;
  error_pause_window_minutes: number;
  warmup_enabled: boolean;
  warmup_start_per_day: number;
  warmup_increment_per_day: number;
  warmup_started_at: string | null;
  paused: boolean;
  paused_reason: string | null;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThrottleStatus {
  allowed: boolean;
  configured: boolean;
  paused?: boolean;
  paused_reason?: string | null;
  sent_today: number;
  error_today?: number;
  limit: number | null;
  absolute_limit?: number;
  min_interval?: number;
  max_interval?: number;
  wait_seconds: number;
  reason?: string | null;
  warmup_enabled?: boolean;
  warmup_day?: number | null;
}

export interface DailyCounter {
  id: string;
  workspace_id: string;
  instance_id: string | null;
  day: string;
  sent_count: number;
  error_count: number;
  last_send_at: string | null;
}

export function useThrottleSettings() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["wa-throttle-settings", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_throttle_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ThrottleSettings[];
    },
  });
}

export function useThrottleStatus(instanceId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["wa-throttle-status", currentWorkspace?.id, instanceId ?? null],
    enabled: !!currentWorkspace?.id,
    staleTime: 10_000,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("wa_get_throttle_status", {
        _workspace_id: currentWorkspace!.id,
        _instance_id: instanceId ?? null,
      });
      if (error) throw error;
      return data as ThrottleStatus;
    },
  });
}

export function useDailyCounters(days = 14) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["wa-daily-counters", currentWorkspace?.id, days],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("whatsapp_send_counters")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .gte("day", since)
        .order("day", { ascending: false });
      if (error) throw error;
      return (data || []) as DailyCounter[];
    },
  });
}

export function useUpsertThrottleSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<ThrottleSettings> & { id?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const payload = { ...input, workspace_id: currentWorkspace.id };
      const { data, error } = input.id
        ? await (supabase as any)
            .from("whatsapp_throttle_settings")
            .update(payload)
            .eq("id", input.id)
            .select()
            .single()
        : await (supabase as any)
            .from("whatsapp_throttle_settings")
            .insert(payload)
            .select()
            .single();
      if (error) throw error;
      return data as ThrottleSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-throttle-settings"] });
      qc.invalidateQueries({ queryKey: ["wa-throttle-status"] });
      toast.success("Configurações guardadas");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao guardar"),
  });
}

export function useTogglePause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paused: boolean; reason?: string | null }) => {
      const { error } = await (supabase as any)
        .from("whatsapp_throttle_settings")
        .update({
          paused: input.paused,
          paused_reason: input.paused ? input.reason ?? "Pausa manual" : null,
          paused_at: input.paused ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["wa-throttle-settings"] });
      qc.invalidateQueries({ queryKey: ["wa-throttle-status"] });
      toast.success(v.paused ? "Envios pausados" : "Envios retomados");
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });
}

export function useStartWarmup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("whatsapp_throttle_settings")
        .update({
          warmup_enabled: true,
          warmup_started_at: new Date().toISOString().slice(0, 10),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-throttle-settings"] });
      qc.invalidateQueries({ queryKey: ["wa-throttle-status"] });
      toast.success("Warm-up iniciado");
    },
  });
}
