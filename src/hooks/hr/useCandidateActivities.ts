import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type CandidateActivity = {
  id: string;
  workspace_id: string;
  candidate_id: string;
  activity_type: "note" | "email_sent" | "email_received" | "stage_changed" | "interview_scheduled" | "interview_completed" | "offer_sent";
  content: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
};

export function useCandidateActivities(candidateId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["hr-candidate-activities", wsId, candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_candidate_activities" as any)
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CandidateActivity[];
    },
    enabled: !!wsId && !!candidateId,
  });
}

export function useCreateCandidateActivity() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: Partial<CandidateActivity>) => {
      const { data, error } = await supabase
        .from("hr_candidate_activities" as any)
        .insert({ ...values, workspace_id: wsId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["hr-candidate-activities", wsId, (variables as any).candidate_id] });
    },
    onError: () => toast.error("Erro ao registar atividade"),
  });
}
