import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type JobOpening = {
  id: string;
  workspace_id: string;
  title: string;
  department: string | null;
  job_type: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  status: "draft" | "published" | "reviewing" | "closed" | "archived";
  positions_count: number;
  created_by: string | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined counts
  applications_count?: number;
};

export function useJobOpenings(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-job-openings", wsId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("hr_job_openings" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as JobOpening[];
    },
    enabled: !!wsId,
  });
}

export function useJobOpening(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-job-opening", wsId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_job_openings" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as JobOpening;
    },
    enabled: !!wsId && !!id,
  });
}

export function useCreateJobOpening() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<JobOpening>) => {
      const { data, error } = await supabase
        .from("hr_job_openings" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vaga criada");
      qc.invalidateQueries({ queryKey: ["hr-job-openings", wsId] });
    },
    onError: () => toast.error("Erro ao criar vaga"),
  });
}

export function useUpdateJobOpening() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<JobOpening> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_job_openings" as any)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vaga atualizada");
      qc.invalidateQueries({ queryKey: ["hr-job-openings", wsId] });
      qc.invalidateQueries({ queryKey: ["hr-job-opening"] });
    },
    onError: () => toast.error("Erro ao atualizar vaga"),
  });
}

export function useDeleteJobOpening() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_job_openings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga eliminada");
      qc.invalidateQueries({ queryKey: ["hr-job-openings", wsId] });
    },
    onError: () => toast.error("Erro ao eliminar vaga"),
  });
}
