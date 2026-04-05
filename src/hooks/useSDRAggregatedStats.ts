import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SDRAggregatedStats {
  // From sdr_enrollments
  totalEnrolled: number;
  totalEnriching: number;
  totalSequenced: number;
  totalReplied: number;
  totalMeetings: number;
  totalConverted: number;
  totalOptedOut: number;
  totalFailed: number;
  // From outreach queue
  outreachPending: number;
  outreachSent: number;
  outreachFailed: number;
  // From multichannel sequences
  activeSequences: number;
  // Rates
  replyRate: number;
  meetingRate: number;
  conversionRate: number;
}

export function useSDRAggregatedStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["sdr-aggregated-stats", workspaceId],
    queryFn: async (): Promise<SDRAggregatedStats> => {
      if (!workspaceId) throw new Error("No workspace");

      // Fetch enrollments, outreach queue, and sequences in parallel
      const [enrollmentsRes, outreachRes, sequencesRes] = await Promise.all([
        supabase
          .from("sdr_enrollments")
          .select("status")
          .eq("workspace_id", workspaceId),
        supabase
          .from("prospecting_outreach_queue")
          .select("status")
          .eq("workspace_id", workspaceId),
        supabase
          .from("multichannel_sequences")
          .select("status")
          .eq("workspace_id", workspaceId)
          .eq("status", "active"),
      ]);

      const enrollments = enrollmentsRes.data || [];
      const outreach = outreachRes.data || [];
      const sequences = sequencesRes.data || [];

      const countStatus = (arr: { status: string }[], ...statuses: string[]) =>
        arr.filter((r) => statuses.includes(r.status)).length;

      const totalEnrolled = countStatus(enrollments, "enrolled");
      const totalEnriching = countStatus(enrollments, "enriching");
      const totalSequenced = countStatus(enrollments, "sequenced");
      const totalReplied = countStatus(enrollments, "replied", "positive_reply");
      const totalMeetings = countStatus(enrollments, "meeting_set");
      const totalConverted = countStatus(enrollments, "converted");
      const totalOptedOut = countStatus(enrollments, "opted_out");
      const totalFailed = countStatus(enrollments, "failed");

      const total = enrollments.length;
      const replyRate = total > 0 ? (totalReplied / total) * 100 : 0;
      const meetingRate = total > 0 ? (totalMeetings / total) * 100 : 0;
      const conversionRate = total > 0 ? (totalConverted / total) * 100 : 0;

      return {
        totalEnrolled,
        totalEnriching,
        totalSequenced,
        totalReplied,
        totalMeetings,
        totalConverted,
        totalOptedOut,
        totalFailed,
        outreachPending: countStatus(outreach, "pending", "scheduled"),
        outreachSent: countStatus(outreach, "sent", "delivered"),
        outreachFailed: countStatus(outreach, "failed", "error"),
        activeSequences: sequences.length,
        replyRate,
        meetingRate,
        conversionRate,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000, // Refresh every 30s
  });
}
