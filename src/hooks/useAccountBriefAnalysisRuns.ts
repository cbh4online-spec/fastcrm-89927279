import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useAccountBriefAnalysisRuns(accountId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ["account-brief-runs", workspaceId, accountId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("account_brief_analysis_runs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (accountId) query = query.eq("account_id", accountId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const triggerAnalysis = useMutation({
    mutationFn: async (accountId: string) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("account-brief-refresh-account", {
        body: { accountId, workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-runs"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
    },
  });

  return {
    runs: runsQuery.data || [],
    isLoading: runsQuery.isLoading,
    triggerAnalysis,
  };
}
