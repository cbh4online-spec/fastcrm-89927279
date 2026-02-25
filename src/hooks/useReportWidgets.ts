import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReportWidget {
  id: string;
  dashboard_id: string;
  title: string;
  chart_type: string;
  dataset: string;
  metric: string;
  value_field: string | null;
  group_by: string;
  filters: Record<string, any>;
  layout_order: number;
  layout_size: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type WidgetInput = Omit<ReportWidget, "id" | "created_by" | "created_at" | "updated_at">;

export function useReportWidgets(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ["report-widgets", dashboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_widgets")
        .select("*")
        .eq("dashboard_id", dashboardId!)
        .order("layout_order");
      if (error) throw error;
      return data as ReportWidget[];
    },
    enabled: !!dashboardId,
  });
}

export function useCreateWidget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: WidgetInput) => {
      const { data, error } = await supabase
        .from("report_widgets")
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ReportWidget;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["report-widgets", d.dashboard_id] });
      toast.success("Widget adicionado");
    },
    onError: () => toast.error("Erro ao criar widget"),
  });
}

export function useUpdateWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ReportWidget> & { id: string; dashboard_id: string }) => {
      const { id, dashboard_id, ...rest } = input;
      const { error } = await supabase
        .from("report_widgets")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return dashboard_id;
    },
    onSuccess: (dashboardId) => qc.invalidateQueries({ queryKey: ["report-widgets", dashboardId] }),
  });
}

export function useDuplicateWidget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (widget: ReportWidget) => {
      const { id, created_at, updated_at, created_by, ...rest } = widget;
      const { data, error } = await supabase
        .from("report_widgets")
        .insert({ ...rest, title: `${rest.title} (cópia)`, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ReportWidget;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["report-widgets", d.dashboard_id] });
      toast.success("Widget duplicado");
    },
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; dashboardId: string }) => {
      const { error } = await supabase.from("report_widgets").delete().eq("id", input.id);
      if (error) throw error;
      return input.dashboardId;
    },
    onSuccess: (dashboardId) => {
      qc.invalidateQueries({ queryKey: ["report-widgets", dashboardId] });
      toast.success("Widget removido");
    },
  });
}
