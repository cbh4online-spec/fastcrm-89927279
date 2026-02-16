import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface Funnel {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  domain: string | null;
  favicon_url: string | null;
  path: string | null;
  head_tracking_code: string | null;
  body_tracking_code: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  vertical_id: string | null;
  type: string;
}

export interface FunnelStep {
  id: string;
  funnel_id: string;
  workspace_id: string;
  name: string;
  step_type: string;
  sort_order: number;
  content: Record<string, unknown>;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface FunnelStepStat {
  id: string;
  step_id: string;
  event_type: string;
  event_date: string;
  count: number;
  amount: number;
}

export interface FunnelTrackingEvent {
  id: string;
  funnel_id: string;
  workspace_id: string;
  pixel_id: string;
  access_token: string | null;
  tracking_level: string;
  events_tracked: string[];
  is_active: boolean;
  created_at: string;
}

export interface FunnelSale {
  id: string;
  funnel_id: string;
  step_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string | null;
  transaction_id: string | null;
  amount: number;
  purchase_date: string;
}

// ── List funnels ──
export function useFunnels() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["funnels", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Funnel[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

// ── Single funnel ──
export function useFunnel(id: string | null) {
  return useQuery({
    queryKey: ["funnel", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Funnel;
    },
    enabled: !!id,
  });
}

// ── Funnel steps ──
export function useFunnelSteps(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-steps", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from("funnel_steps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FunnelStep[];
    },
    enabled: !!funnelId,
  });
}

// ── Step stats ──
export function useFunnelStepStats(funnelId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["funnel-step-stats", funnelId, dateFrom, dateTo],
    queryFn: async () => {
      if (!funnelId) return [];
      let query = supabase
        .from("funnel_step_stats")
        .select("*, funnel_steps!inner(funnel_id, name)")
        .eq("funnel_steps.funnel_id", funnelId);
      if (dateFrom) query = query.gte("event_date", dateFrom);
      if (dateTo) query = query.lte("event_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });
}

// ── Sales ──
export function useFunnelSales(funnelId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["funnel-sales", funnelId, dateFrom, dateTo],
    queryFn: async () => {
      if (!funnelId) return [];
      let query = supabase
        .from("funnel_sales")
        .select("*, funnel_steps(name)")
        .eq("funnel_id", funnelId)
        .order("purchase_date", { ascending: false });
      if (dateFrom) query = query.gte("purchase_date", dateFrom);
      if (dateTo) query = query.lte("purchase_date", dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data as (FunnelSale & { funnel_steps: { name: string } | null })[];
    },
    enabled: !!funnelId,
  });
}

// ── Tracking events ──
export function useFunnelTrackingEvents(funnelId: string | null) {
  return useQuery({
    queryKey: ["funnel-tracking-events", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from("funnel_tracking_events")
        .select("*")
        .eq("funnel_id", funnelId);
      if (error) throw error;
      return data as FunnelTrackingEvent[];
    },
    enabled: !!funnelId,
  });
}

// ── Create funnel ──
export function useCreateFunnel() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; vertical_id?: string; type?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("funnels")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Create 3 default steps
      const defaultSteps = [
        { name: "Home", step_type: "page", sort_order: 0 },
        { name: "Formulário", step_type: "optin", sort_order: 1 },
        { name: "Obrigado", step_type: "thankyou", sort_order: 2 },
      ];
      await supabase.from("funnel_steps").insert(
        defaultSteps.map((s) => ({
          ...s,
          funnel_id: data.id,
          workspace_id: currentWorkspace.id,
        }))
      );
      return data as Funnel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funil criado com sucesso");
    },
    onError: (e) => toast.error("Erro ao criar funil: " + e.message),
  });
}

// ── Update funnel ──
export function useUpdateFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Funnel> & { id: string }) => {
      const { data, error } = await supabase
        .from("funnels")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Funnel;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      qc.invalidateQueries({ queryKey: ["funnel", d.id] });
      toast.success("Funil atualizado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Delete funnel ──
export function useDeleteFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funil eliminado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Create step ──
export function useCreateFunnelStep() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { funnel_id: string; name: string; step_type: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from("funnel_steps")
        .insert({ ...input, workspace_id: currentWorkspace!.id })
        .select()
        .single();
      if (error) throw error;
      return data as FunnelStep;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-steps", d.funnel_id] });
      toast.success("Step adicionado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Update step ──
export function useUpdateFunnelStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<FunnelStep> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      const { data, error } = await supabase
        .from("funnel_steps")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as FunnelStep;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-steps", d.funnel_id] });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Delete step ──
export function useDeleteFunnelStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }) => {
      const { error } = await supabase.from("funnel_steps").delete().eq("id", id);
      if (error) throw error;
      return funnelId;
    },
    onSuccess: (funnelId) => {
      qc.invalidateQueries({ queryKey: ["funnel-steps", funnelId] });
      toast.success("Step eliminado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Create tracking event ──
export function useCreateTrackingEvent() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { funnel_id: string; pixel_id: string; access_token?: string; tracking_level?: string; events_tracked?: string[] }) => {
      const { data, error } = await supabase
        .from("funnel_tracking_events")
        .insert({ ...input, workspace_id: currentWorkspace!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["funnel-tracking-events"] });
      toast.success("Evento de tracking adicionado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ── Delete tracking event ──
export function useDeleteTrackingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnel_tracking_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnel-tracking-events"] });
      toast.success("Evento removido");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
