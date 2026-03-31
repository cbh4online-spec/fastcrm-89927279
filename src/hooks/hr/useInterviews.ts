import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type Interview = {
  id: string;
  workspace_id: string;
  application_id: string;
  interview_type: "in_person" | "remote" | "phone";
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  interviewer_ids: string[];
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  application?: {
    id: string;
    candidate: {
      id: string;
      full_name: string;
      email: string | null;
    };
    job_opening: {
      id: string;
      title: string;
    };
  };
};

export type InterviewScorecard = {
  id: string;
  workspace_id: string;
  interview_id: string;
  interviewer_id: string | null;
  criteria: Array<{ name: string; score: number; notes?: string }>;
  overall_rating: number | null;
  feedback: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
};

export function useInterviews(applicationId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-interviews", wsId, applicationId],
    queryFn: async () => {
      let q = supabase
        .from("hr_interviews" as any)
        .select("*, application:hr_applications!application_id(id, candidate:hr_candidates!candidate_id(id, full_name, email), job_opening:hr_job_openings!job_opening_id(id, title))")
        .eq("workspace_id", wsId!)
        .order("scheduled_at", { ascending: true });
      if (applicationId) q = q.eq("application_id", applicationId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Interview[];
    },
    enabled: !!wsId,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<Interview>) => {
      const { data, error } = await supabase
        .from("hr_interviews" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Entrevista agendada");
      qc.invalidateQueries({ queryKey: ["hr-interviews", wsId] });
    },
    onError: () => toast.error("Erro ao agendar entrevista"),
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Interview> & { id: string }) => {
      const { data, error } = await supabase
        .from("hr_interviews" as any)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Entrevista atualizada");
      qc.invalidateQueries({ queryKey: ["hr-interviews", wsId] });
    },
    onError: () => toast.error("Erro ao atualizar entrevista"),
  });
}

export function useInterviewScorecards(interviewId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-interview-scorecards", wsId, interviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_interview_scorecards" as any)
        .select("*")
        .eq("interview_id", interviewId!)
        .order("created_at");
      if (error) throw error;
      return data as unknown as InterviewScorecard[];
    },
    enabled: !!wsId && !!interviewId,
  });
}

export function useCreateScorecard() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<InterviewScorecard>) => {
      const { data, error } = await supabase
        .from("hr_interview_scorecards" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Avaliação guardada");
      qc.invalidateQueries({ queryKey: ["hr-interview-scorecards"] });
    },
    onError: () => toast.error("Erro ao guardar avaliação"),
  });
}
