import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HRAbsenceType = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  paid: boolean;
  requires_approval: boolean;
  max_days_per_year: number | null;
};

export type HRAbsence = {
  id: string;
  workspace_id: string;
  employee_id: string;
  absence_type_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  hr_employees?: { full_name: string; avatar_url: string | null };
  hr_absence_types?: { name: string; color: string; paid: boolean };
};

export function useHRAbsences(statusFilter?: string, employeeId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-absences", wsId, statusFilter, employeeId],
    queryFn: async () => {
      let q = supabase
        .from("hr_absences" as any)
        .select("*, hr_employees(full_name, avatar_url), hr_absence_types(name, color, paid)")
        .eq("workspace_id", wsId!)
        .order("start_date", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HRAbsence[];
    },
    enabled: !!wsId,
  });
}

export function useHRAbsenceTypes() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-absence-types", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_absence_types" as any).select("*").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data as unknown as HRAbsenceType[];
    },
    enabled: !!wsId,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: {
      employee_id: string;
      absence_type_id: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.from("hr_absences" as any).insert({ ...values, workspace_id: wsId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pedido de ausência criado");
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
    },
    onError: () => toast.error("Erro ao criar pedido"),
  });
}

export function useApproveAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ absence_id, action, rejection_reason }: { absence_id: string; action: "approved" | "rejected"; rejection_reason?: string }) => {
      const res = await supabase.functions.invoke("hr-absence-approve", { body: { absence_id, action, rejection_reason } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "approved" ? "Ausência aprovada" : "Ausência rejeitada");
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
    },
    onError: () => toast.error("Erro ao processar pedido"),
  });
}

export function useSeedAbsenceDefaults() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("hr-seed-defaults", {
        body: { workspace_id: currentWorkspace?.id }
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-absence-types"] }),
  });
}
