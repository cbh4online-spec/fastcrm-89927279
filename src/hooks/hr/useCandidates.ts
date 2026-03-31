import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type CandidateStage =
  | "new"
  | "screening"
  | "phone_interview"
  | "technical_interview"
  | "onsite_interview"
  | "offer"
  | "hired"
  | "rejected";

export type Candidate = {
  id: string;
  workspace_id: string;
  job_posting_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  applied_at: string;
  source: string;
  referrer_id: string | null;
  cv_url: string | null;
  cv_parsed_data: any;
  cover_letter_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  avatar_url: string | null;
  stage: CandidateStage;
  ai_score: number | null;
  ai_analysis: any;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  job_posting?: { id: string; title: string } | null;
};

export function useCandidates(jobPostingId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-candidates", wsId, jobPostingId],
    queryFn: async () => {
      let q = supabase
        .from("hr_candidates" as any)
        .select("*, job_posting:hr_job_postings!job_posting_id(id, title)")
        .eq("workspace_id", wsId!)
        .order("applied_at", { ascending: false });
      if (jobPostingId) q = q.eq("job_posting_id", jobPostingId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Candidate[];
    },
    enabled: !!wsId,
  });
}

export function useCandidate(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-candidate", wsId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .select("*, job_posting:hr_job_postings!job_posting_id(id, title)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    enabled: !!wsId && !!id,
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidato criado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
    },
    onError: () => toast.error("Erro ao criar candidato"),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidato atualizado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
      qc.invalidateQueries({ queryKey: ["hr-candidate"] });
    },
    onError: () => toast.error("Erro ao atualizar candidato"),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_candidates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidato eliminado");
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
    },
    onError: () => toast.error("Erro ao eliminar candidato"),
  });
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: CandidateStage }) => {
      const { data, error } = await supabase
        .from("hr_candidates" as any)
        .update({ stage })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-candidates", wsId] });
      qc.invalidateQueries({ queryKey: ["hr-candidate"] });
    },
    onError: () => toast.error("Erro ao mudar etapa"),
  });
}

export function useParseCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidate_id, cv_text }: { candidate_id: string; cv_text: string }) => {
      const { data, error } = await supabase.functions.invoke("hr-cv-parse-ai", {
        body: { candidate_id, cv_text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-candidates"] });
      qc.invalidateQueries({ queryKey: ["hr-candidate"] });
      toast.success("CV analisado com sucesso");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao analisar CV"),
  });
}

export function useScoreCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (candidate_id: string) => {
      const { data, error } = await supabase.functions.invoke("hr-candidate-score-ai", {
        body: { candidate_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-candidates"] });
      qc.invalidateQueries({ queryKey: ["hr-candidate"] });
      toast.success("Score IA calculado");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao calcular score"),
  });
}
