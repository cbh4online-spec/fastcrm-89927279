import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-contracts";

export type HRContract = {
  id: string;
  workspace_id: string;
  employee_id: string;
  contract_type: "permanent" | "fixed_term" | "freelance" | "internship";
  start_date: string;
  end_date: string | null;
  salary: number;
  currency: string;
  salary_frequency: "monthly" | "annual" | "hourly" | null;
  hours_per_week: number;
  document_url: string | null;
  signed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hr_employees?: { full_name: string; employee_number: string | null };
};

export function useHRContracts(employeeId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: [KEY, wsId, employeeId],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("hr_contracts" as any)
        .select("*, hr_employees(full_name, employee_number)")
        .eq("workspace_id", wsId!)
        .order("start_date", { ascending: false });

      if (employeeId) {
        q = q.eq("employee_id", employeeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as HRContract[];
    },
  });
}

export function useCreateHRContract() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (
      values: Omit<HRContract, "id" | "workspace_id" | "created_at" | "updated_at" | "hr_employees">
    ) => {
      const { error } = await supabase
        .from("hr_contracts" as any)
        .insert({ ...values, workspace_id: wsId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHRContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: { id: string } & Partial<HRContract>) => {
      const { error } = await supabase
        .from("hr_contracts" as any)
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Contrato atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHRContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_contracts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Contrato eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
