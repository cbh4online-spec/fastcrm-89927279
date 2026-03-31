import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type Interview = {
  id: string;
  workspace_id: string;
  candidate_id: string;
  job_posting_id: string | null;
  interview_type: "phone_screening" | "technical" | "behavioral" | "panel" | "onsite";
  scheduled_at: string;
  duration_minutes: number;
  interviewer_ids: string[];
  location_type: "in_person" | "video" | "phone" | null;
  meeting_link: string | null;
  location_address: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  feedback: any;
  overall_rating: number | null;
  recommendation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  candidate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  job_posting?: {
    id: string;
    title: string;
  } | null;
};

export function useInterviews(candidateId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-interviews", wsId, candidateId],
    queryFn: async () => {
      let q = supabase
        .from("hr_interviews" as any)
        .select("*, candidate:hr_candidates!candidate_id(id, first_name, last_name, email), job_posting:hr_job_postings!job_posting_id(id, title)")
        .eq("workspace_id", wsId!)
        .order("scheduled_at", { ascending: true });
      if (candidateId) q = q.eq("candidate_id", candidateId);
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
        .update(values)
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
