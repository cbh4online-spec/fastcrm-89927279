import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useAIUsage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-usage-stats", {
        body: { workspaceId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return {
    plan: data?.plan ?? "free",
    callsUsed: data?.calls_used ?? 0,
    callsIncluded: data?.calls_included ?? 0,
    callsPct: data?.calls_pct ?? 0,
    pendingOverage: data?.pending_overage_eur ?? 0,
    cycleEnd: data?.cycle_end ? new Date(data.cycle_end) : null,
    usageByTier: (data?.usage_by_tier ?? {}) as Record<string, number>,
    isNearLimit: (data?.calls_pct ?? 0) >= 80,
    isAtLimit: (data?.calls_pct ?? 0) >= 100,
    isLoading,
  };
}
