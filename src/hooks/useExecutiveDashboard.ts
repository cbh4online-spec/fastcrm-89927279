import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as any;

export type AttributionModel = "first_touch" | "last_touch" | "assisted" | "manual";
export type ExecPeriod = { from: string; to: string; label: string };

export function getPeriod(preset: string): ExecPeriod {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "prev_month":
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "quarter": {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    default:
      start.setDate(start.getDate() - 7);
  }
  return { from: start.toISOString(), to: end.toISOString(), label: preset };
}

export function useExecutiveOverview(period: ExecPeriod, model: AttributionModel = "last_touch") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-overview", currentWorkspace?.id, period.from, period.to, model],
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("executive_overview", {
        p_workspace_id: currentWorkspace!.id,
        p_from: period.from,
        p_to: period.to,
        p_model: model,
      });
      if (error) throw error;
      return data as any;
    },
  });
}

export function useRevenueByChannel(period: ExecPeriod, model: AttributionModel = "last_touch") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-revenue-channel", currentWorkspace?.id, period.from, period.to, model],
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc("executive_revenue_by_channel", {
        p_workspace_id: currentWorkspace!.id,
        p_from: period.from,
        p_to: period.to,
        p_model: model,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        channel_type: string;
        events: number;
        leads: number;
        opportunities: number;
        conversions: number;
        revenue: number;
        margin: number;
      }>;
    },
  });
}

export function useExecutiveLeaks(status: string = "open") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-leaks", currentWorkspace?.id, status],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("revenue_leaks")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExecutiveRecommendations() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-recs", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("executive_recommendations")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .in("status", ["open", "acknowledged", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExecutiveActions() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-actions", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("executive_action_items")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .in("status", ["open", "in_progress", "overdue"])
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExecutiveAttributionEvents(period: ExecPeriod, channel?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["exec-attr-events", currentWorkspace?.id, period.from, period.to, channel],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = sb
        .from("revenue_attribution_events")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .gte("occurred_at", period.from)
        .lte("occurred_at", period.to)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (channel) q = q.eq("channel_type", channel);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGenerateExecutiveSummary() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ period, model = "last_touch" }: { period: ExecPeriod; model?: AttributionModel }) => {
      const { data, error } = await supabase.functions.invoke("executive-generate-summary", {
        body: {
          workspace_id: currentWorkspace?.id,
          period_start: period.from,
          period_end: period.to,
          attribution_model: model,
          persist: true,
        },
      });
      if (error) throw error;
      if (data?.fallback) {
        const msg =
          data.error === "rate_limited"
            ? "Limite de IA atingido. Tente novamente mais tarde."
            : data.error === "credits_exhausted"
            ? "Créditos de IA esgotados."
            : "Resumo gerado com fallback (IA indisponível).";
        toast({ title: "Aviso", description: msg, variant: "default" });
      } else {
        toast({ title: "Resumo executivo gerado" });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-recs"] });
      qc.invalidateQueries({ queryKey: ["exec-overview"] });
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateRecommendation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await sb.from("executive_recommendations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-recs"] });
      toast({ title: "Recomendação atualizada" });
    },
  });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      recommendation_id?: string;
      priority?: string;
      action_type?: string;
      due_at?: string;
    }) => {
      const { error } = await sb.from("executive_action_items").insert({
        workspace_id: currentWorkspace?.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-actions"] });
      toast({ title: "Ação criada" });
    },
  });
}

export function useUpdateActionItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await sb.from("executive_action_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-actions"] });
      toast({ title: "Ação atualizada" });
    },
  });
}

export function useResolveLeak() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await sb.from("revenue_leaks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exec-leaks"] });
      toast({ title: "Fuga atualizada" });
    },
  });
}
