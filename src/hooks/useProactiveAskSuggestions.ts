import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { useRevenueForecast } from "@/hooks/useRevenueForecast";

export interface ProactiveSuggestion {
  id: string;
  message: string;
  askQuery: string;
  automationQuery?: string;
  priority: "high" | "medium";
  icon: string;
}

export function useProactiveAskSuggestions() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: intel } = useIntelligencePanel();
  const { latestForecast } = useRevenueForecast();

  return useQuery({
    queryKey: ["proactive-ask-suggestions", currentWorkspace?.id, intel?.computed_at, latestForecast?.id],
    queryFn: async (): Promise<ProactiveSuggestion[]> => {
      if (!currentWorkspace?.id) return [];

      const suggestions: ProactiveSuggestion[] = [];
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();
      const endOfWeek = new Date(now.getTime() + 7 * 86400000).toISOString();

      // 1. Stale deals (existing)
      const { count: staleDeals } = await workspaceClient
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .lt("updated_at", tenDaysAgo);

      if (staleDeals && staleDeals > 0) {
        suggestions.push({
          id: "stale-deals",
          message: `${staleDeals} deal${staleDeals !== 1 ? "s" : ""} without activity for 10+ days.`,
          askQuery: "Deals with no activity in 10 days",
          automationQuery: "Remind me if a deal has no activity for 7 days",
          priority: staleDeals >= 5 ? "high" : "medium",
          icon: "AlertTriangle",
        });
      }

      // 2. Closing this week (existing)
      const { count: urgentDeals } = await workspaceClient
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .lte("close_date", endOfWeek)
        .gte("close_date", now.toISOString());

      if (urgentDeals && urgentDeals > 0) {
        suggestions.push({
          id: "closing-no-step",
          message: `${urgentDeals} deal${urgentDeals !== 1 ? "s" : ""} closing this week.`,
          askQuery: "Deals closing this week",
          priority: "high",
          icon: "Clock",
        });
      }

      // 3. High-value at risk (from intelligence panel)
      if (intel) {
        const atRiskCount = intel.health_distribution.AT_RISK;
        if (atRiskCount > 0) {
          suggestions.push({
            id: "high-value-at-risk",
            message: `${atRiskCount} deal${atRiskCount !== 1 ? "s" : ""} at risk in your pipeline.`,
            askQuery: "Deals at risk",
            priority: atRiskCount >= 3 ? "high" : "medium",
            icon: "ShieldAlert",
          });
        }

        // 4. Stage bottleneck
        const slowStages = (intel.stage_benchmarks || []).filter(
          (b) => b.avg_days !== null && b.expected_days > 0 && (b.avg_days ?? 0) > b.expected_days * 1.5
        );
        if (slowStages.length > 0) {
          const stage = slowStages[0];
          const pctSlower = Math.round(((stage.avg_days! - stage.expected_days) / stage.expected_days) * 100);
          suggestions.push({
            id: "stage-bottleneck",
            message: `Stage "${stage.stage_name}" is ${pctSlower}% slower than usual.`,
            askQuery: `Deals in stage ${stage.stage_name}`,
            priority: pctSlower >= 100 ? "high" : "medium",
            icon: "Timer",
          });
        }
      }

      // 5. Forecast drift
      if (latestForecast) {
        const healthAdj = (latestForecast as any).health_adjusted_expected as number | undefined;
        if (healthAdj && healthAdj > 0 && latestForecast.expected_case > 0) {
          const drift = Math.abs(healthAdj - latestForecast.expected_case) / latestForecast.expected_case;
          if (drift > 0.2) {
            const pct = Math.round(drift * 100);
            suggestions.push({
              id: "forecast-drift",
              message: `Risk-adjusted forecast differs ${pct}% from expected.`,
              askQuery: "Revenue forecast details",
              priority: drift > 0.3 ? "high" : "medium",
              icon: "TrendingDown",
            });
          }
        }
      }

      // Sort by priority, limit to 3
      return suggestions
        .sort((a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1))
        .slice(0, 3);
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
