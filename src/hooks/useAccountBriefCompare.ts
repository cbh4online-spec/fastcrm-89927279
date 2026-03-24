import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ComparisonRun {
  id: string;
  workspace_id: string;
  account_ids: string[];
  summary_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export function useAccountBriefCompare() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const historyQuery = useQuery({
    queryKey: ["account-brief-comparison-runs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase
        .from("account_brief_comparison_runs" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20) as any);
      if (error) throw error;
      return (data || []) as ComparisonRun[];
    },
    enabled: !!workspaceId,
  });

  const compareAccounts = useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!workspaceId || !user) throw new Error("Workspace não encontrado");
      if (accountIds.length < 2 || accountIds.length > 5) throw new Error("Selecione entre 2 e 5 contas");

      const { data, error } = await supabase.functions.invoke("account-brief-compare-accounts", {
        body: { workspace_id: workspaceId, account_ids: accountIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Comparação concluída!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-comparison-runs"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro na comparação"),
  });

  return {
    history: historyQuery.data || [],
    isLoadingHistory: historyQuery.isLoading,
    compareAccounts,
    isComparing: compareAccounts.isPending,
  };
}
