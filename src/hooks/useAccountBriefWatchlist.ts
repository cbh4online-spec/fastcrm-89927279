import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface WatchlistItem {
  id: string;
  workspace_id: string;
  account_id: string;
  is_active: boolean;
  watch_reason: string;
  refresh_frequency: string;
  next_run_at: string | null;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  account_brief_accounts?: {
    id: string;
    name: string;
    domain: string;
    total_score: number | null;
    score_label: string | null;
    last_analysis_at: string | null;
  };
}

const FREQ_HOURS: Record<string, number> = {
  daily: 24,
  weekly: 168,
  biweekly: 336,
  monthly: 720,
};

function computeNextRun(frequency: string): string | null {
  const hours = FREQ_HOURS[frequency];
  if (!hours) return null;
  return new Date(Date.now() + hours * 3600000).toISOString();
}

export function useAccountBriefWatchlist() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const watchlistQuery = useQuery({
    queryKey: ["account-brief-watchlist", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase
        .from("account_brief_watchlists" as any)
        .select("*, account_brief_accounts(id, name, domain, total_score, score_label, last_analysis_at)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as WatchlistItem[];
    },
    enabled: !!workspaceId,
  });

  const isWatched = (accountId: string) =>
    watchlistQuery.data?.some((w) => w.account_id === accountId && w.is_active) ?? false;

  const addToWatchlist = useMutation({
    mutationFn: async ({ accountId, reason, frequency }: { accountId: string; reason: string; frequency: string }) => {
      if (!workspaceId || !user) throw new Error("Workspace não encontrado");
      const { error } = await (supabase
        .from("account_brief_watchlists" as any)
        .upsert({
          workspace_id: workspaceId,
          account_id: accountId,
          is_active: true,
          watch_reason: reason,
          refresh_frequency: frequency,
          next_run_at: computeNextRun(frequency),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,account_id" }) as any);
      if (error) throw error;
      emitKernelEvent({
        workspace_id: workspaceId,
        type: "account_brief.watchlist_added",
        entity_kind: "account_brief_account",
        entity_id: accountId,
        actor_id: user.id,
        source_module: "account-brief",
        payload: { reason, frequency },
      });
    },
    onSuccess: () => {
      toast.success("Conta adicionada à watchlist!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-watchlist"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro"),
  });

  const pauseWatchlist = useMutation({
    mutationFn: async (watchlistId: string) => {
      const { error } = await (supabase
        .from("account_brief_watchlists" as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", watchlistId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Watchlist pausada");
      queryClient.invalidateQueries({ queryKey: ["account-brief-watchlist"] });
    },
  });

  const resumeWatchlist = useMutation({
    mutationFn: async ({ watchlistId, frequency }: { watchlistId: string; frequency: string }) => {
      const { error } = await (supabase
        .from("account_brief_watchlists" as any)
        .update({
          is_active: true,
          next_run_at: computeNextRun(frequency),
          updated_at: new Date().toISOString(),
        })
        .eq("id", watchlistId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Watchlist reactivada");
      queryClient.invalidateQueries({ queryKey: ["account-brief-watchlist"] });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (watchlistId: string) => {
      const { error } = await (supabase
        .from("account_brief_watchlists" as any)
        .delete()
        .eq("id", watchlistId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido da watchlist");
      queryClient.invalidateQueries({ queryKey: ["account-brief-watchlist"] });
    },
  });

  return {
    watchlist: watchlistQuery.data || [],
    activeCount: watchlistQuery.data?.filter((w) => w.is_active).length ?? 0,
    isLoading: watchlistQuery.isLoading,
    isWatched,
    addToWatchlist,
    pauseWatchlist,
    resumeWatchlist,
    removeFromWatchlist,
  };
}
