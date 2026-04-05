import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface StepLog {
  id: string;
  sdr_enrollment_id: string;
  sequence_step_id: string;
  channel: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function useSDRStepLogs(enrollmentId: string | null) {
  return useQuery({
    queryKey: ["sdr-step-logs", enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sdr_sequence_step_logs")
        .select("*")
        .eq("sdr_enrollment_id", enrollmentId!)
        .order("created_at");
      if (error) throw error;
      return (data || []) as StepLog[];
    },
    enabled: !!enrollmentId,
  });
}

export function useSDRSequenceMetricsData(campaignId: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sdr-step-metrics", campaignId, currentWorkspace?.id],
    queryFn: async () => {
      // Get all enrollment IDs for this campaign
      const { data: enrollments } = await supabase
        .from("sdr_enrollments")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("workspace_id", currentWorkspace!.id);

      if (!enrollments?.length) return [];

      const enrollmentIds = enrollments.map((e) => e.id);

      const { data: logs, error } = await supabase
        .from("sdr_sequence_step_logs")
        .select("sequence_step_id, status, channel")
        .in("sdr_enrollment_id", enrollmentIds);

      if (error) throw error;

      // Group by step
      const stepMap = new Map<string, { sent: number; opened: number; clicked: number; replied: number; failed: number }>();
      for (const log of logs || []) {
        const key = log.sequence_step_id;
        if (!stepMap.has(key)) stepMap.set(key, { sent: 0, opened: 0, clicked: 0, replied: 0, failed: 0 });
        const s = stepMap.get(key)!;
        if (log.status === "sent") s.sent++;
        if (log.status === "opened") s.opened++;
        if (log.status === "clicked") s.clicked++;
        if (log.status === "replied") s.replied++;
        if (log.status === "failed") s.failed++;
      }

      return Array.from(stepMap.entries()).map(([stepId, counts]) => ({
        stepId,
        ...counts,
      }));
    },
    enabled: !!campaignId && !!currentWorkspace?.id,
  });
}

export function usePauseResumeSequence() {
  const queryClient = useQueryClient();

  const pauseMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("sdr_enrollments")
        .update({ status: "paused" })
        .eq("id", enrollmentId)
        .eq("status", "sequenced");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequência pausada");
      queryClient.invalidateQueries({ queryKey: ["sdr-enrollments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("sdr_enrollments")
        .update({ status: "sequenced" })
        .eq("id", enrollmentId)
        .eq("status", "paused");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequência retomada");
      queryClient.invalidateQueries({ queryKey: ["sdr-enrollments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { pauseSequence: pauseMutation.mutate, resumeSequence: resumeMutation.mutate };
}
