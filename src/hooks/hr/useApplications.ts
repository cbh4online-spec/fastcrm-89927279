import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type Application = {
  id: string;
  workspace_id: string;
  job_opening_id: string;
  candidate_id: string;
  stage: "new" | "screening" | "interview" | "test" | "offer" | "hired" | "rejected";
  stage_id: string | null;
  rating: number | null;
  ai_score: number | null;
  ai_score_reasoning: string | null;
  rejection_reason: string | null;
  applied_at: string;
  moved_at: string;
  created_at: string;
  updated_at: string;
  // joined
  candidate?: {
    id: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    cv_path: string | null;
  };
  job_opening?: {
    id: string;
    title: string;
  };
};

export function useApplications(jobOpeningId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-applications", wsId, jobOpeningId],
    queryFn: async () => {
      let q = supabase
        .from("hr_applications" as any)
        .select("*, candidate:hr_candidates!candidate_id(id, full_name, email, avatar_url, cv_path), job_opening:hr_job_openings!job_opening_id(id, title)")
        .eq("workspace_id", wsId!)
        .order("moved_at", { ascending: false });
      if (jobOpeningId) q = q.eq("job_opening_id", jobOpeningId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Application[];
    },
    enabled: !!wsId,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<Application>) => {
      const { data, error } = await supabase
        .from("hr_applications" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidatura registada");
      qc.invalidateQueries({ queryKey: ["hr-applications", wsId] });
    },
    onError: () => toast.error("Erro ao registar candidatura"),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Application> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_applications" as any)
        .update({ ...values, updated_at: new Date().toISOString(), moved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-applications", wsId] });
    },
    onError: () => toast.error("Erro ao atualizar candidatura"),
  });
}
