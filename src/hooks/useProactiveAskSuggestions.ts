import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

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

  return useQuery({
    queryKey: ["proactive-ask-suggestions", currentWorkspace?.id],
    queryFn: async (): Promise<ProactiveSuggestion[]> => {
      if (!currentWorkspace?.id) return [];

      const suggestions: ProactiveSuggestion[] = [];
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 86400000).toISOString();
      const endOfWeek = new Date(now.getTime() + 7 * 86400000).toISOString();

      // Deals with no activity > 10 days
      const { count: staleDeals } = await workspaceClient
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .lt("updated_at", tenDaysAgo);

      if (staleDeals && staleDeals > 0) {
        suggestions.push({
          id: "stale-deals",
          message: `You have ${staleDeals} deal${staleDeals !== 1 ? "s" : ""} without activity for 10+ days.`,
          askQuery: "Deals with no activity in 10 days",
          automationQuery: "Remind me if a deal has no activity for 7 days",
          priority: staleDeals >= 5 ? "high" : "medium",
          icon: "AlertTriangle",
        });
      }

      // Deals closing this week with no next step
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

      return suggestions.slice(0, 2);
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000,
  });
}
