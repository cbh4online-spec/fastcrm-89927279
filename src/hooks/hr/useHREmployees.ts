import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type HREmployee = {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  employee_number: string | null;
  contract_type: "full_time" | "part_time" | "contractor" | "intern";
  start_date: string | null;
  end_date: string | null;
  status: "active" | "inactive" | "on_leave";
  avatar_url: string | null;
  qr_code_token: string;
  weekly_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useHREmployees(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-employees", wsId, statusFilter],
    queryFn: async () => {
      let q = supabase.from("hr_employees" as any).select("*").eq("workspace_id", wsId!).order("full_name");
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HREmployee[];
    },
    enabled: !!wsId,
  });
}

export function useHREmployee(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-employee", wsId, id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_employees" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as unknown as HREmployee;
    },
    enabled: !!wsId && !!id,
  });
}

export function useCreateHREmployee() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<HREmployee>) => {
      const { data, error } = await supabase.from("hr_employees" as any).insert({ ...values, workspace_id: wsId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Funcionário criado");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
    },
    onError: () => toast.error("Erro ao criar funcionário"),
  });
}

export function useUpdateHREmployee() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<HREmployee> & { id: string }) => {
      const { data, error } = await supabase.from("hr_employees" as any).update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Funcionário atualizado");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee"] });
    },
    onError: () => toast.error("Erro ao atualizar funcionário"),
  });
}

export function useDeleteHREmployee() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_employees" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funcionário eliminado");
      queryClient.invalidateQueries({ queryKey: ["hr-employees", wsId] });
    },
    onError: () => toast.error("Erro ao eliminar funcionário"),
  });
}
