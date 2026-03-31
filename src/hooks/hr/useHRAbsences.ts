import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HRAbsenceType = {
  id: string;
  workspace_id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string;
  paid: boolean;
  requires_approval: boolean;
  max_days_per_year: number | null;
  can_carry_over: boolean;
  advance_notice_days: number | null;
  is_active: boolean;
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
  notes: string | null;
  requested_by: string | null;
  conflict_detected: boolean;
  conflict_details: any | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  hr_employees?: { full_name: string; avatar_url: string | null };
  hr_absence_types?: { name: string; color: string; paid: boolean; code: string | null };
};

export function useHRAbsences(statusFilter?: string, employeeId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-absences", wsId, statusFilter, employeeId],
    queryFn: async () => {
      let q = supabase
        .from("hr_absences" as any)
        .select("*, hr_employees(full_name, avatar_url), hr_absence_types(name, color, paid, code)")
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
      const { data, error } = await supabase
        .from("hr_absence_types" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as unknown as HRAbsenceType[];
    },
    enabled: !!wsId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      workspace_id: string;
      employee_id: string;
      absence_type_id: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      const res = await supabase.functions.invoke("hr-leave-request-create", { body: values });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      const msg = data?.conflict_detected
        ? `Pedido criado (${data.business_days} dias úteis) — conflito detectado!`
        : `Pedido criado (${data.business_days} dias úteis)`;
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar pedido"),
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ absence_id, action, rejection_reason }: { absence_id: string; action: "approved" | "rejected"; rejection_reason?: string }) => {
      const res = await supabase.functions.invoke("hr-leave-request-approve", { body: { absence_id, action, rejection_reason } });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "approved" ? "Ausência aprovada" : "Ausência rejeitada");
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao processar pedido"),
  });
}

// Keep legacy exports for backward compatibility
export { useCreateAbsence, useApproveAbsence, useSeedAbsenceDefaults } from "@/hooks/hr/useHRAbsencesLegacy";
