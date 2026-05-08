import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadChefSequenceRunLog {
  id: string;
  run_id: string;
  step_order: number | null;
  action_type: string | null;
  status: string;
  reason: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  executed_at: string;
}

/** Reads the execution log for a given sequence run (most recent first). */
export function useLeadChefSequenceRunLogs(runId?: string | null, opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  return useQuery({
    queryKey: ["leadchef", "sequence-run-logs", runId, limit],
    enabled: !!runId,
    staleTime: 15_000,
    queryFn: async (): Promise<LeadChefSequenceRunLog[]> => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("leadchef_sequence_run_logs")
        .select("id, run_id, step_order, action_type, status, reason, message, metadata, executed_at")
        .eq("run_id", runId)
        .order("executed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LeadChefSequenceRunLog[];
    },
  });
}
