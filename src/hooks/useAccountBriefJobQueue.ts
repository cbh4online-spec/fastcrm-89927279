import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface JobQueueItem {
  id: string;
  workspace_id: string;
  account_id: string | null;
  job_type: string;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  timeout_ms: number;
  correlation_id: string | null;
  error_summary: string | null;
  created_at: string;
}

export function useAccountBriefJobQueue() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["account-brief-jobs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_job_queue")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as JobQueueItem[];
    },
    enabled: !!workspaceId,
  });

  const enqueueJob = useMutation({
    mutationFn: async ({ accountId, jobType, priority = 5 }: {
      accountId: string; jobType: string; priority?: number;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("account_brief_job_queue")
        .insert({
          workspace_id: workspaceId,
          account_id: accountId,
          job_type: jobType,
          priority,
          status: "queued",
          correlation_id: crypto.randomUUID(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-jobs"] }),
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("account_brief_job_queue")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-jobs"] }),
  });

  const retryJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("account_brief_job_queue")
        .update({ status: "queued", attempts: 0, error_summary: null, finished_at: null })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-jobs"] }),
  });

  const queuedCount = jobs.filter(j => j.status === "queued").length;
  const runningCount = jobs.filter(j => j.status === "running").length;
  const failedCount = jobs.filter(j => j.status === "failed").length;

  return { jobs, isLoading, enqueueJob, cancelJob, retryJob, queuedCount, runningCount, failedCount };
}
