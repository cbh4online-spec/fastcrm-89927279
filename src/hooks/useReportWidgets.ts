import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
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
  const { currentWorkspace } = useWorkspace();
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
      console.log(`[DASHBOARD] Widget added: ${d.id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.WIDGET_ADDED',
          entity_kind: 'widget',
          entity_id: d.id,
          source_module: 'core-dashboard',
          payload: {
            dashboard_id: d.dashboard_id,
            chart_type: d.chart_type,
            dataset: d.dataset,
            metric: d.metric,
            group_by: d.group_by,
            layout_size: d.layout_size,
          },
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao criar widget");
      console.warn('[DASHBOARD] WIDGET_ADD_FAILED', err);
    },
  });
}

export function useUpdateWidget() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<ReportWidget> & { id: string; dashboard_id: string }) => {
      const { id, dashboard_id, ...rest } = input;
      const { error } = await supabase
        .from("report_widgets")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return { id, dashboard_id };
    },
    onSuccess: ({ id, dashboard_id }) => {
      qc.invalidateQueries({ queryKey: ["report-widgets", dashboard_id] });
      console.log(`[DASHBOARD] Widget updated: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.WIDGET_UPDATED',
          entity_kind: 'widget',
          entity_id: id,
          source_module: 'core-dashboard',
          payload: { dashboard_id },
        });
      }
    },
    onError: (err) => console.warn('[DASHBOARD] WIDGET_UPDATE_FAILED', err),
  });
}

export function useDuplicateWidget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
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
      console.log(`[DASHBOARD] Widget duplicated: ${d.id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.WIDGET_DUPLICATED',
          entity_kind: 'widget',
          entity_id: d.id,
          source_module: 'core-dashboard',
          payload: { dashboard_id: d.dashboard_id, chart_type: d.chart_type },
        });
      }
    },
    onError: (err) => console.warn('[DASHBOARD] WIDGET_DUPLICATE_FAILED', err),
  });
}

export function useDeleteWidget() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; dashboardId: string }) => {
      const { error } = await supabase.from("report_widgets").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: ({ id, dashboardId }) => {
      qc.invalidateQueries({ queryKey: ["report-widgets", dashboardId] });
      toast.success("Widget removido");
      console.log(`[DASHBOARD] Widget deleted: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.WIDGET_DELETED',
          entity_kind: 'widget',
          entity_id: id,
          source_module: 'core-dashboard',
          payload: { dashboard_id: dashboardId },
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao remover widget");
      console.warn('[DASHBOARD] WIDGET_DELETE_FAILED', err);
    },
  });
}
