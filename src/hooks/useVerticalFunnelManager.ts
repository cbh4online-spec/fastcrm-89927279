import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Settings ────────────────────────────────────────────────────────
export interface VerticalTemplateSettings {
  id: string;
  template_id: string;
  workspace_id: string;
  domain: string | null;
  path: string | null;
  favicon_url: string | null;
  head_tracking_code: string | null;
  body_tracking_code: string | null;
  chat_widget: string;
  payment_mode_live: boolean;
  require_credit_card: boolean;
  image_optimization: boolean;
  optimize_javascript: boolean;
  gdpr_compliant_fonts: boolean;
}

export function useVerticalTemplateSettings(templateId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["vertical_template_settings", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const { data, error } = await (supabase as any)
        .from("vertical_template_settings")
        .select("*")
        .eq("template_id", templateId)
        .maybeSingle();
      if (error) throw error;
      return data as VerticalTemplateSettings | null;
    },
    enabled: !!templateId,
  });
}

export function useUpsertVerticalTemplateSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<VerticalTemplateSettings> & { template_id: string }) => {
      const payload = { ...input, workspace_id: currentWorkspace!.id };
      const { data: existing } = await (supabase as any)
        .from("vertical_template_settings")
        .select("id")
        .eq("template_id", input.template_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await (supabase as any)
          .from("vertical_template_settings")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("vertical_template_settings")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["vertical_template_settings", vars.template_id] });
      toast.success("Definições guardadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Tracking Events ─────────────────────────────────────────────────
export interface VerticalTrackingEvent {
  id: string;
  template_id: string;
  workspace_id: string;
  pixel_id: string;
  access_token: string | null;
  tracking_level: string;
  events_tracked: string[];
  is_active: boolean;
}

export function useVerticalTrackingEvents(templateId: string | null) {
  return useQuery({
    queryKey: ["vertical_tracking_events", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await (supabase as any)
        .from("vertical_tracking_events")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VerticalTrackingEvent[];
    },
    enabled: !!templateId,
  });
}

export function useCreateVerticalTrackingEvent() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { template_id: string; pixel_id: string; access_token?: string; tracking_level?: string; events_tracked?: string[] }) => {
      const { data, error } = await (supabase as any)
        .from("vertical_tracking_events")
        .insert({ ...input, workspace_id: currentWorkspace!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["vertical_tracking_events", vars.template_id] });
      toast.success("Pixel adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVerticalTrackingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await (supabase as any).from("vertical_tracking_events").delete().eq("id", id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      qc.invalidateQueries({ queryKey: ["vertical_tracking_events", templateId] });
      toast.success("Pixel removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Sales ────────────────────────────────────────────────────────────
export interface VerticalTemplateSale {
  id: string;
  template_id: string;
  customer_name: string;
  customer_email: string | null;
  product_name: string | null;
  transaction_id: string | null;
  amount: number;
  purchase_date: string;
}

export function useVerticalTemplateSales(templateId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["vertical_template_sales", templateId, dateFrom, dateTo],
    queryFn: async () => {
      if (!templateId) return [];
      let q = (supabase as any)
        .from("vertical_template_sales")
        .select("*")
        .eq("template_id", templateId)
        .order("purchase_date", { ascending: false });
      if (dateFrom) q = q.gte("purchase_date", dateFrom);
      if (dateTo) q = q.lte("purchase_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VerticalTemplateSale[];
    },
    enabled: !!templateId,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────
export interface VerticalTemplateStatRow {
  section: string;
  views: number;
  uniqueViews: number;
  submissions: number;
  rate: number;
}

export function useVerticalTemplateStats(templateSlug: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["vertical_template_stats", templateSlug, dateFrom, dateTo],
    queryFn: async () => {
      if (!templateSlug) return [];
      let q = (supabase as any)
        .from("vertical_landing_events")
        .select("event_type, session_id, created_at")
        .eq("template_slug", templateSlug);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo);
      const { data, error } = await q;
      if (error) throw error;

      const uniqueSessions = new Set<string>();
      let allViews = 0;
      let submissions = 0;

      for (const row of data ?? []) {
        if (row.event_type === "view") {
          allViews++;
          if (row.session_id) uniqueSessions.add(row.session_id);
        } else if (row.event_type === "form_submit") {
          submissions++;
        }
      }

      if (allViews === 0 && submissions === 0) return [];

      return [
        {
          section: "page",
          views: allViews,
          uniqueViews: uniqueSessions.size,
          submissions,
          rate: allViews > 0 ? (submissions / allViews) * 100 : 0,
        },
      ] as VerticalTemplateStatRow[];
    },
    enabled: !!templateSlug,
  });
}
