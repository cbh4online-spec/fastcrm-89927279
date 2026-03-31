import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-job-titles";

export function useHRJobTitles(onlyActive = false) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: [KEY, wsId, onlyActive],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("hr_job_titles")
        .select("*, hr_departments(name)")
        .eq("workspace_id", wsId!)
        .order("name");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHRJobTitle() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: { name: string; department_id?: string | null; description?: string; level?: string | null; salary_min?: number | null; salary_max?: number | null; currency?: string }) => {
      const { error } = await supabase
        .from("hr_job_titles")
        .insert({ ...values, workspace_id: wsId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Cargo criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHRJobTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; department_id?: string | null; is_active?: boolean; description?: string; level?: string | null; salary_min?: number | null; salary_max?: number | null; currency?: string }) => {
      const { error } = await supabase
        .from("hr_job_titles")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Cargo atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHRJobTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_job_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Cargo eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
