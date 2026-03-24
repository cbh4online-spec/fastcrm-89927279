import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

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
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-runs"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-account"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-brief"] });
      queryClient.invalidateQueries({ queryKey: ["account-brief-score"] });
      if (data?.status === "completed") {
        toast.success(`Análise concluída! Score: ${data.score || 0} — ${data.processed || 0} páginas processadas`);
      } else if (data?.status === "partial") {
        toast.warning(`Análise parcial: ${data.processed || 0} páginas processadas. Algumas etapas falharam (verifique o saldo de IA).`);
      } else {
        toast.info("Análise terminada.");
      }
    },
    onError: (err: Error) => {
      toast.error(`Erro na análise: ${err.message}`);
    },
  });

  return {
    runs: runsQuery.data || [],
    isLoading: runsQuery.isLoading,
    triggerAnalysis,
  };
}
