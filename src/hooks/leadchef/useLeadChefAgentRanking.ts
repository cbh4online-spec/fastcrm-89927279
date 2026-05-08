import { useMemo } from "react";
import { useLeadChefTeamOverview } from "./useLeadChefTeamOverview";
import type { LeadChefPeriod } from "@/utils/leadchef/period";

export interface LeadChefAgentRankRow {
  userId: string;
  name: string;
  leadsCreated: number;
  demosCompleted: number;
  salesWon: number;
  conversionRate: number;
  score: number;
}

export function useLeadChefAgentRanking(period: LeadChefPeriod = "month") {
  const overview = useLeadChefTeamOverview(period);

  const rows = useMemo<LeadChefAgentRankRow[]>(() => {
    if (!overview.data) return [];
    return overview.data.agentSummaries
      .map((s) => {
        const conv = s.leadsCreated ? Math.round((s.salesWon / s.leadsCreated) * 100) : 0;
        const score = s.salesWon * 5 + s.demosCompleted * 2 + s.leadsCreated;
        return {
          userId: s.member.userId,
          name: s.member.name ?? s.member.email ?? "Agente",
          leadsCreated: s.leadsCreated,
          demosCompleted: s.demosCompleted,
          salesWon: s.salesWon,
          conversionRate: conv,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [overview.data]);

  return { ...overview, rows };
}
