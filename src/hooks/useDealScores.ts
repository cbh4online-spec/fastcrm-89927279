import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface DealScore {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  close_score: number;
  category: "low" | "uncertain" | "likely" | "hot";
  urgency: "normal" | "high" | "critical";
  next_action: string | null;
  score_breakdown: {
    engagement_score: number;
    recency_score: number;
    trust_score: number;
    objection_penalty: number;
    intent_score: number;
    historical_similarity: number;
  } | null;
  updated_at: string;
}

/** Fetches all deal scores for the current workspace as a Map<opportunityId, DealScore> */
export function useDealScores() {
  const { currentWorkspace } = useWorkspace();

  const { data, isLoading, error } = useQuery({
    queryKey: ["deal-scores", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("deal_scores")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return (data || []) as DealScore[];
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Build a fast lookup Map
  const scoresMap = new Map<string, DealScore>();
  data?.forEach((score) => scoresMap.set(score.opportunity_id, score));

  return { scoresMap, scores: data || [], isLoading, error };
}

/** Fetches a single deal score for one opportunity */
export function useDealScore(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["deal-score", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null;
      const { data, error } = await supabase
        .from("deal_scores")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .maybeSingle();
      if (error) throw error;
      return data as DealScore | null;
    },
    enabled: !!opportunityId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Mutation to compute/recompute a deal score via edge function */
export function useComputeDealScore() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      workspace_id,
      opportunity_id,
    }: {
      workspace_id: string;
      opportunity_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("compute-deal-score", {
        body: { workspace_id, opportunity_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data as DealScore;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-scores", currentWorkspace?.id] });
      if (data?.opportunity_id) {
        queryClient.invalidateQueries({ queryKey: ["deal-score", data.opportunity_id] });
      }
    },
  });
}

/** Category display helpers */
export function getCategoryLabel(category: DealScore["category"]) {
  switch (category) {
    case "hot": return "Quente";
    case "likely": return "Provável";
    case "uncertain": return "Incerto";
    case "low": return "Baixo";
    default: return category;
  }
}

export function getCategoryColors(category: DealScore["category"]) {
  switch (category) {
    case "hot":
      return "bg-red-100 text-red-700 border-red-200";
    case "likely":
      return "bg-green-100 text-green-700 border-green-200";
    case "uncertain":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
    default:
      return "bg-muted text-muted-foreground";
  }
}
