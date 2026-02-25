import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useOpportunities } from "@/hooks/useOpportunities";

export interface DealWithHealth {
  [key: string]: any;
  health_score?: number;
  health_label?: string;
  top_reason?: string | null;
}

export function useDealsWithHealth() {
  const { currentWorkspace } = useWorkspace();
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities();

  const dealIds = (opportunities || [])
    .filter((o: any) => o.status === "open")
    .map((o: any) => o.id);

  const { data: healthMap, isLoading: healthLoading } = useQuery({
    queryKey: ["bulk-deal-health", currentWorkspace?.id, dealIds.length],
    queryFn: async () => {
      if (!currentWorkspace?.id || dealIds.length === 0) return {};

      const { data, error } = await supabase.functions.invoke("deal-intelligence", {
        headers: { "X-Workspace-Id": currentWorkspace.id },
        body: { mode: "bulk", deal_ids: dealIds },
      });

      if (error) throw error;
      return (data?.items || {}) as Record<string, { health_score: number; health_label: string; top_reason: string | null }>;
    },
    enabled: !!currentWorkspace?.id && dealIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const enrichedDeals: DealWithHealth[] = (opportunities || []).map((opp: any) => {
    const h = healthMap?.[opp.id];
    return {
      ...opp,
      health_score: h?.health_score,
      health_label: h?.health_label,
      top_reason: h?.top_reason ?? null,
    };
  });

  return {
    data: enrichedDeals,
    isLoading: oppsLoading || healthLoading,
  };
}
