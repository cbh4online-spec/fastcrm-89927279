import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

export interface ReportDashboard {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useReportDashboards() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["report-dashboards", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_dashboards")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReportDashboard[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("report_dashboards")
        .insert({
          workspace_id: currentWorkspace!.id,
          name: input.name,
          description: input.description || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ReportDashboard;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["report-dashboards"] });
      toast.success("Dashboard criado");
      console.log(`[DASHBOARD] Dashboard created: ${d.id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.CREATED',
          entity_kind: 'dashboard',
          entity_id: d.id,
          source_module: 'core-dashboard',
          payload: { name: d.name },
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao criar dashboard");
      console.warn('[DASHBOARD] DASHBOARD_CREATE_FAILED', err);
    },
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_dashboards").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["report-dashboards"] });
      toast.success("Dashboard eliminado");
      console.log(`[DASHBOARD] Dashboard deleted: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.DELETED',
          entity_kind: 'dashboard',
          entity_id: id,
          source_module: 'core-dashboard',
        });
      }
    },
    onError: (err) => {
      toast.error("Erro ao eliminar dashboard");
      console.warn('[DASHBOARD] DASHBOARD_DELETE_FAILED', err);
    },
  });
}

export function useUpdateDashboard() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string }) => {
      const { error } = await supabase
        .from("report_dashboards")
        .update({ name: input.name, description: input.description, updated_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      return input.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["report-dashboards"] });
      console.log(`[DASHBOARD] Dashboard updated: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DASHBOARD.UPDATED',
          entity_kind: 'dashboard',
          entity_id: id,
          source_module: 'core-dashboard',
        });
      }
    },
    onError: (err) => console.warn('[DASHBOARD] DASHBOARD_UPDATE_FAILED', err),
  });
}
