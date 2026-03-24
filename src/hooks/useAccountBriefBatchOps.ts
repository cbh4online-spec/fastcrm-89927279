import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export interface BatchRun {
  id: string;
  batch_type: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export function useAccountBriefBatchOps() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: batchRuns = [], isLoading } = useQuery({
    queryKey: ["account-brief-batch-runs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_batch_runs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as BatchRun[];
    },
    enabled: !!workspaceId,
  });

  const startBatch = useMutation({
    mutationFn: async ({ batchType, accountIds, payload }: {
      batchType: string; accountIds: string[]; payload?: Record<string, unknown>;
    }) => {
      if (!workspaceId || !user?.id) throw new Error("No workspace/user");
      const { data: run, error: runErr } = await supabase
        .from("account_brief_batch_runs")
        .insert({
          workspace_id: workspaceId,
          initiated_by: user.id,
          batch_type: batchType,
          total_items: accountIds.length,
          status: "queued",
          payload_json: payload || {},
        })
        .select()
        .single();
      if (runErr) throw runErr;

      const items = accountIds.map(aid => ({
        batch_run_id: run.id,
        account_id: aid,
        status: "pending",
      }));
      const { error: itemsErr } = await supabase.from("account_brief_batch_run_items").insert(items);
      if (itemsErr) throw itemsErr;

      return run;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-batch-runs"] }),
  });

  return { batchRuns, isLoading, startBatch };
}
