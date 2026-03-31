import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type JobPosting = {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  department_id: string | null;
  employment_type: string;
  location: string | null;
  remote_option: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  requirements: string[];
  nice_to_have: string[];
  status: "draft" | "active" | "closed" | "cancelled";
  published_at: string | null;
  closes_at: string | null;
  slug: string | null;
  public_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export function useJobPostings(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-job-postings", wsId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("hr_job_postings" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as JobPosting[];
    },
    enabled: !!wsId,
  });
}

export function useJobPosting(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-job-posting", wsId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_job_postings" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as JobPosting;
    },
    enabled: !!wsId && !!id,
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<JobPosting>) => {
      const { data, error } = await supabase
        .from("hr_job_postings" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vaga criada");
      qc.invalidateQueries({ queryKey: ["hr-job-postings", wsId] });
    },
    onError: () => toast.error("Erro ao criar vaga"),
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<JobPosting> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_job_postings" as any)
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Vaga atualizada");
      qc.invalidateQueries({ queryKey: ["hr-job-postings", wsId] });
      qc.invalidateQueries({ queryKey: ["hr-job-posting"] });
    },
    onError: () => toast.error("Erro ao atualizar vaga"),
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_job_postings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vaga eliminada");
      qc.invalidateQueries({ queryKey: ["hr-job-postings", wsId] });
    },
    onError: () => toast.error("Erro ao eliminar vaga"),
  });
}
