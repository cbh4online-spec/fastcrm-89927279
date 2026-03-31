import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-departments";

export function useHRDepartments(onlyActive = false) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: [KEY, wsId, onlyActive],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("hr_departments")
        .select("*, head:hr_employees(id, full_name), parent:hr_departments(id, name)")
        .eq("workspace_id", wsId!)
        .order("name");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHRDepartment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: { name: string; description?: string; parent_department_id?: string | null; head_id?: string | null }) => {
      const { error } = await supabase
        .from("hr_departments")
        .insert({ ...values, workspace_id: wsId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Departamento criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHRDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("hr_departments")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Departamento atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHRDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Departamento eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
