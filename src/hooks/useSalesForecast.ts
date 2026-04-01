import { useMemo } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useQuery } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  isWithinInterval,
  differenceInDays,
} from "date-fns";
import { pt } from "date-fns/locale";

export type ForecastPeriodFilter = "month" | "quarter" | "year" | "6months";

export interface ForecastFilters {
  pipelineId?: string;
  ownerId?: string;
  period: ForecastPeriodFilter;
}

export interface ForecastByStage {
  stage_id: string;
  stage_name: string;
  stage_color: string;
  position: number;
  probability: number;
  deal_count: number;
  total_value: number;
  weighted_value: number;
}

export interface ForecastByOwner {
  owner_id: string;
  owner_name: string;
  avatar_url: string | null;
  deal_count: number;
  pipeline_value: number;
  weighted_value: number;
  win_rate: number;
  avg_cycle_days: number;
}

export interface ForecastTrendPoint {
  month: string;
  month_key: string;
  total_value: number;
  weighted_value: number;
  deal_count: number;
}

export interface ForecastKPIs {
  totalPipeline: number;
  weightedForecast: number;
  bestCase: number;
  activeDeals: number;
  avgWinRate: number;
}

export interface SalesForecastData {
  kpis: ForecastKPIs;
  byStage: ForecastByStage[];
  byOwner: ForecastByOwner[];
  trend: ForecastTrendPoint[];
}

function getPeriodRange(period: ForecastPeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "6months":
      return { start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) };
  }
}

export function useSalesForecast(filters: ForecastFilters) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities();
  const { data: members } = useWorkspaceMembers();

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["pipeline_stages_forecast", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .select("id, name, color, position, probability, pipeline_id")
        .eq("workspace_id", currentWorkspace.id)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo((): SalesForecastData | null => {
    if (!opportunities || !stages || !members) return null;

    const { start, end } = getPeriodRange(filters.period);

    // Filter active opportunities
    let filtered = opportunities.filter((o: any) => o.status === "open");

    // Filter by pipeline
    if (filters.pipelineId) {
      const pipelineStageIds = new Set(
        stages.filter((s: any) => s.pipeline_id === filters.pipelineId).map((s: any) => s.id)
      );
      filtered = filtered.filter((o: any) => pipelineStageIds.has(o.stage_id));
    }

    // Filter by owner
    if (filters.ownerId) {
      filtered = filtered.filter((o: any) => o.owner_id === filters.ownerId);
    }

    // Filter by period (expected_close_date within range, or created_at if no close date)
    const periodFiltered = filtered.filter((o: any) => {
      const dateStr = o.expected_close_date || o.created_at;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start, end });
    });

    const stageMap = new Map(stages.map((s: any) => [s.id, s]));
    const memberMap = new Map(members.map((m) => [m.user_id, m]));

    // All opps for win rate calculation (not just period-filtered)
    const allOpps = opportunities;
    const wonOpps = allOpps.filter((o: any) => o.status === "won");
    const lostOpps = allOpps.filter((o: any) => o.status === "lost");

    // --- By Stage ---
    const stageGroups = new Map<string, typeof periodFiltered>();
    periodFiltered.forEach((o: any) => {
      const arr = stageGroups.get(o.stage_id) || [];
      arr.push(o);
      stageGroups.set(o.stage_id, arr);
    });

    const byStage: ForecastByStage[] = stages
      .filter((s: any) => stageGroups.has(s.id))
      .map((s: any) => {
        const opps = stageGroups.get(s.id) || [];
        const totalValue = opps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
        const prob = (s.probability || 0) / 100;
        return {
          stage_id: s.id,
          stage_name: s.name,
          stage_color: s.color || "hsl(var(--primary))",
          position: s.position,
          probability: s.probability || 0,
          deal_count: opps.length,
          total_value: totalValue,
          weighted_value: totalValue * prob,
        };
      })
      .sort((a, b) => a.position - b.position);

    // --- By Owner ---
    const ownerGroups = new Map<string, any[]>();
    periodFiltered.forEach((o: any) => {
      if (!o.owner_id) return;
      const arr = ownerGroups.get(o.owner_id) || [];
      arr.push(o);
      ownerGroups.set(o.owner_id, arr);
    });

    const byOwner: ForecastByOwner[] = Array.from(ownerGroups.entries()).map(([ownerId, opps]) => {
      const totalValue = opps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
      const weightedValue = opps.reduce((sum: number, o: any) => {
        const stage = stageMap.get(o.stage_id);
        const prob = stage ? (stage.probability || 0) / 100 : 0;
        return sum + (o.value || 0) * prob;
      }, 0);

      // Win rate for this owner (all time)
      const ownerWon = wonOpps.filter((o: any) => o.owner_id === ownerId).length;
      const ownerLost = lostOpps.filter((o: any) => o.owner_id === ownerId).length;
      const ownerTotal = ownerWon + ownerLost;
      const winRate = ownerTotal > 0 ? (ownerWon / ownerTotal) * 100 : 0;

      // Avg cycle from won deals
      const ownerWonOpps = wonOpps.filter((o: any) => o.owner_id === ownerId);
      const cycleDays = ownerWonOpps.map((o: any) =>
        differenceInDays(new Date(o.updated_at), new Date(o.created_at))
      ).filter((d: number) => d > 0);
      const avgCycle = cycleDays.length > 0
        ? Math.round(cycleDays.reduce((a: number, b: number) => a + b, 0) / cycleDays.length)
        : 0;

      const member = memberMap.get(ownerId);
      return {
        owner_id: ownerId,
        owner_name: member?.profile?.full_name || "—",
        avatar_url: member?.profile?.avatar_url || null,
        deal_count: opps.length,
        pipeline_value: totalValue,
        weighted_value: weightedValue,
        win_rate: winRate,
        avg_cycle_days: avgCycle,
      };
    }).sort((a, b) => b.weighted_value - a.weighted_value);

    // --- Trend (by month, last 6 months) ---
    const now = new Date();
    const trend: ForecastTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthKey = format(monthStart, "yyyy-MM");
      const monthLabel = format(monthStart, "MMM yy", { locale: pt });

      const monthOpps = filtered.filter((o: any) => {
        const dateStr = o.expected_close_date || o.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      const totalValue = monthOpps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
      const weightedValue = monthOpps.reduce((sum: number, o: any) => {
        const stage = stageMap.get(o.stage_id);
        const prob = stage ? (stage.probability || 0) / 100 : 0;
        return sum + (o.value || 0) * prob;
      }, 0);

      trend.push({
        month: monthLabel,
        month_key: monthKey,
        total_value: totalValue,
        weighted_value: weightedValue,
        deal_count: monthOpps.length,
      });
    }

    // --- KPIs ---
    const totalPipeline = periodFiltered.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    const weightedForecast = periodFiltered.reduce((sum: number, o: any) => {
      const stage = stageMap.get(o.stage_id);
      const prob = stage ? (stage.probability || 0) / 100 : 0;
      return sum + (o.value || 0) * prob;
    }, 0);
    const bestCase = totalPipeline; // all deals close
    const activeDeals = periodFiltered.length;
    const totalWon = wonOpps.length;
    const totalClosed = totalWon + lostOpps.length;
    const avgWinRate = totalClosed > 0 ? (totalWon / totalClosed) * 100 : 0;

    return {
      kpis: { totalPipeline, weightedForecast, bestCase, activeDeals, avgWinRate },
      byStage,
      byOwner,
      trend,
    };
  }, [opportunities, stages, members, filters]);

  return {
    data: result,
    isLoading: oppsLoading || stagesLoading,
  };
}

// Helper to get unique pipelines from stages
export function usePipelines() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["pipelines", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await workspaceClient
        .from("pipelines")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
  });
}
