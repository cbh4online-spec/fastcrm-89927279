import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-departments";

export type HRDepartment = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  parent_department_id: string | null;
  head_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  head: { id: string; full_name: string } | null;
  parent: { id: string; name: string } | null;
  headcount: number;
};

export function useHRDepartments(onlyActive = false) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: [KEY, wsId, onlyActive],
    enabled: !!wsId,
    queryFn: async () => {
      // Fetch departments with head and parent joins
      let q = supabase
        .from("hr_departments")
        .select(`
          *,
          head:head_id(id, full_name),
          parent:parent_department_id(id, name)
        `)
        .eq("workspace_id", wsId!)
        .order("name");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) {
        console.error("[useHRDepartments] query error:", error);
        throw error;
      }

      // Fetch headcount per department
      const { data: employees } = await supabase
        .from("hr_employees")
        .select("department_id")
        .eq("workspace_id", wsId!)
        .not("department_id", "is", null);

      const countMap = new Map<string, number>();
      (employees ?? []).forEach((e: any) => {
        countMap.set(e.department_id, (countMap.get(e.department_id) || 0) + 1);
      });

      return (data ?? []).map((dept: any) => ({
        ...dept,
        head: dept.head || null,
        parent: dept.parent || null,
        headcount: countMap.get(dept.id) || 0,
      })) as HRDepartment[];
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
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; is_active?: boolean; parent_department_id?: string | null; head_id?: string | null }) => {
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
