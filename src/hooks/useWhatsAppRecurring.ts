import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export type RecurringFrequency = "daily" | "weekly" | "monthly";
export type RecurringStatus = "active" | "paused" | "completed";
export type RecurringTargetType = "segment" | "tags" | "all";

export interface WhatsAppRecurringCampaign {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  target_type: RecurringTargetType;
  segment_id: string | null;
  target_tags: string[];
  template_id: string | null;
  body: string;
  media_url: string | null;
  media_mime_type: string | null;
  cta_url: string | null;
  cta_label: string | null;
  frequency: RecurringFrequency;
  weekly_days: number[];
  monthly_day: number | null;
  run_time: string;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  max_runs: number | null;
  run_count: number;
  jitter_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_dispatch_count: number;
  last_error: string | null;
  status: RecurringStatus;
  created_at: string;
  updated_at: string;
}

export interface UpsertRecurringInput {
  id?: string;
  name: string;
  description?: string;
  target_type: RecurringTargetType;
  segment_id?: string | null;
  target_tags?: string[];
  template_id?: string | null;
  body: string;
  media_url?: string | null;
  cta_url?: string | null;
  frequency: RecurringFrequency;
  weekly_days?: number[];
  monthly_day?: number | null;
  run_time: string;
  timezone?: string;
  starts_at?: string;
  ends_at?: string | null;
  max_runs?: number | null;
  jitter_minutes?: number;
  status?: RecurringStatus;
}

export function useWhatsAppRecurring() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["wa-recurring", wid],
    enabled: !!wid,
    queryFn: async () => {
      const { data, error } = await sb
        .from("whatsapp_recurring_campaigns")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WhatsAppRecurringCampaign[];
    },
  });
}

/** Calcula primeira execução com base nas regras (mesma lógica do edge — útil para preview). */
export function computeFirstNextRun(input: {
  frequency: RecurringFrequency;
  weekly_days?: number[];
  monthly_day?: number | null;
  run_time: string;
  starts_at?: string;
}): string {
  const [h, m] = input.run_time.split(":").map((n) => parseInt(n, 10));
  const start = input.starts_at ? new Date(input.starts_at) : new Date();
  const candidate = new Date(start.getTime());
  candidate.setHours(h || 9, m || 0, 0, 0);
  if (candidate < new Date()) candidate.setDate(candidate.getDate() + 1);

  for (let i = 0; i < 366; i++) {
    if (input.frequency === "daily") return candidate.toISOString();
    if (input.frequency === "weekly") {
      const wanted = input.weekly_days || [];
      if (wanted.length === 0 || wanted.includes(candidate.getDay())) return candidate.toISOString();
    }
    if (input.frequency === "monthly") {
      const day = input.monthly_day ?? 1;
      if (candidate.getDate() === day) return candidate.toISOString();
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.toISOString();
}

export function useUpsertRecurring() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpsertRecurringInput) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sem workspace");
      const next_run_at = computeFirstNextRun(input);

      if (input.id) {
        const { error } = await sb
          .from("whatsapp_recurring_campaigns")
          .update({
            name: input.name,
            description: input.description ?? null,
            target_type: input.target_type,
            segment_id: input.segment_id ?? null,
            target_tags: input.target_tags ?? [],
            template_id: input.template_id ?? null,
            body: input.body,
            media_url: input.media_url ?? null,
            cta_url: input.cta_url ?? null,
            frequency: input.frequency,
            weekly_days: input.weekly_days ?? [],
            monthly_day: input.monthly_day ?? null,
            run_time: input.run_time,
            timezone: input.timezone ?? "Europe/Lisbon",
            starts_at: input.starts_at ?? new Date().toISOString(),
            ends_at: input.ends_at ?? null,
            max_runs: input.max_runs ?? null,
            jitter_minutes: input.jitter_minutes ?? 0,
            status: input.status ?? "active",
            next_run_at,
          })
          .eq("id", input.id)
          .eq("workspace_id", currentWorkspace.id);
        if (error) throw error;
        return input.id;
      }

      const { data, error } = await sb
        .from("whatsapp_recurring_campaigns")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: input.name,
          description: input.description ?? null,
          target_type: input.target_type,
          segment_id: input.segment_id ?? null,
          target_tags: input.target_tags ?? [],
          template_id: input.template_id ?? null,
          body: input.body,
          media_url: input.media_url ?? null,
          cta_url: input.cta_url ?? null,
          frequency: input.frequency,
          weekly_days: input.weekly_days ?? [],
          monthly_day: input.monthly_day ?? null,
          run_time: input.run_time,
          timezone: input.timezone ?? "Europe/Lisbon",
          starts_at: input.starts_at ?? new Date().toISOString(),
          ends_at: input.ends_at ?? null,
          max_runs: input.max_runs ?? null,
          jitter_minutes: input.jitter_minutes ?? 0,
          status: input.status ?? "active",
          next_run_at,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-recurring"] });
      toast.success("Campanha recorrente guardada");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao guardar"),
  });
}

export function useToggleRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecurringStatus }) => {
      const { error } = await sb
        .from("whatsapp_recurring_campaigns")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-recurring"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("whatsapp_recurring_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-recurring"] });
      toast.success("Campanha eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunRecurringNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-pro-recurring-tick", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-recurring"] });
      toast.success("Tick executado");
    },
    onError: (e: Error) => toast.error("Falha: " + e.message),
  });
}
