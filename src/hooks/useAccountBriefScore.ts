import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAccountBriefScore(accountId: string | undefined) {
  const scoreQuery = useQuery({
    queryKey: ["account-brief-score", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("account_brief_scores")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const factorsQuery = useQuery({
    queryKey: ["account-brief-score-factors", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("account_brief_score_factors")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });

  return {
    score: scoreQuery.data,
    factors: factorsQuery.data || [],
    isLoading: scoreQuery.isLoading || factorsQuery.isLoading,
  };
}
