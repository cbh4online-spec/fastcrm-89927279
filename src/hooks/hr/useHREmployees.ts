import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-employees";

export type HREmployee = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  employee_number: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  department_id: string | null;
  department_name: string | null;
  position_id: string | null;
  position_name: string | null;
  manager_id: string | null;
  manager_name: string | null;
  contract_type: string | null;
  contract_type_id: string | null;
  contract_type_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  weekly_hours: number | null;
  qr_code_token: string | null;
  notes: string | null;
  job_title: string | null;
};

export function useHREmployees(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: [KEY, wsId, statusFilter],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("hr_employees")
        .select(`
          *,
          hr_departments!hr_employees_department_id_fkey(id, name),
          hr_job_titles:position_id(id, name),
          manager:manager_id(id, full_name)
        `)
        .eq("workspace_id", wsId!)
        .order("full_name");

      if (statusFilter) q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) {
        console.error("[useHREmployees] query error:", error);
        throw error;
      }

      return (data ?? []).map((e: any) => ({
        id: e.id,
        workspace_id: e.workspace_id,
        user_id: e.user_id,
        employee_number: e.employee_number,
        full_name: e.full_name || "Sem nome",
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email || null,
        phone: e.phone,
        avatar_url: e.avatar_url || null,
        department_id: e.department_id,
        department_name: e.hr_departments?.name || null,
        position_id: e.position_id,
        position_name: e.hr_job_titles?.name || null,
        manager_id: e.manager_id,
        manager_name: e.manager?.full_name || null,
        contract_type: e.contract_type,
        contract_type_id: e.contract_type_id,
        contract_type_name: null, // will be enriched if needed
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status || "active",
        weekly_hours: e.weekly_hours ?? 40,
        qr_code_token: e.qr_code_token,
        notes: e.notes,
        job_title: e.job_title || e.hr_job_titles?.name || null,
      })) as HREmployee[];
    },
  });
}

export function useHREmployee(employeeId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["hr-employee", wsId, employeeId],
    enabled: !!wsId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select(`
          *,
          profiles:user_id(full_name, email, avatar_url),
          hr_departments!hr_employees_department_id_fkey(id, name),
          hr_job_titles:position_id(id, name),
          manager:manager_id(id, full_name)
        `)
        .eq("id", employeeId!)
        .single();

      if (error) throw error;

      const e = data as any;
      return {
        id: e.id,
        workspace_id: e.workspace_id,
        user_id: e.user_id,
        employee_number: e.employee_number,
        full_name: e.full_name || e.profiles?.full_name || "Sem nome",
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email || e.profiles?.email || null,
        phone: e.phone,
        avatar_url: e.profiles?.avatar_url || null,
        department_id: e.department_id,
        department_name: e.hr_departments?.name || null,
        position_id: e.position_id,
        position_name: e.hr_job_titles?.name || null,
        manager_id: e.manager_id,
        manager_name: e.manager?.full_name || null,
        contract_type: e.contract_type,
        contract_type_id: e.contract_type_id,
        contract_type_name: null,
        start_date: e.start_date,
        end_date: e.end_date,
        status: e.status || "active",
        weekly_hours: e.weekly_hours ?? 40,
        qr_code_token: e.qr_code_token,
        notes: e.notes,
        job_title: e.job_title || e.hr_job_titles?.name || null,
      } as HREmployee;
    },
  });
}

export function useCreateHREmployee() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (values: {
      full_name: string;
      email?: string | null;
      phone?: string | null;
      department_id?: string | null;
      position_id?: string | null;
      manager_id?: string | null;
      contract_type?: string | null;
      contract_type_id?: string | null;
      employee_number?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      status?: string;
      weekly_hours?: number;
      notes?: string | null;
      job_title?: string | null;
    }) => {
      const { error } = await supabase
        .from("hr_employees")
        .insert({
          ...values,
          workspace_id: wsId!,
          status: values.status || "active",
          weekly_hours: values.weekly_hours || 40,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Funcionário criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHREmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      full_name?: string;
      email?: string | null;
      phone?: string | null;
      department_id?: string | null;
      position_id?: string | null;
      manager_id?: string | null;
      contract_type?: string | null;
      contract_type_id?: string | null;
      employee_number?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      status?: string;
      weekly_hours?: number;
      notes?: string | null;
      job_title?: string | null;
    }) => {
      const { error } = await supabase
        .from("hr_employees")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["hr-employee"] });
      toast.success("Funcionário atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Keep backward compat aliases
export const useCreateHREmployeeProfile = useCreateHREmployee;
export const useUpdateHREmployeeProfile = useUpdateHREmployee;

export function useDeleteHREmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_employees")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Funcionário removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCurrentHREmployee() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["hr-current-employee", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("hr_employees")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string; full_name: string; user_id: string } | null;
    },
    enabled: !!currentWorkspace,
  });
}
