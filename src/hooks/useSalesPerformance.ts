import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { startOfQuarter, subQuarters, startOfWeek, subWeeks, startOfMonth, subMonths, format, differenceInDays } from "date-fns";

export interface SalesKPI {
  label: string;
  value: number;
  formatted: string;
  trend: number;
  trendDirection: "up" | "down" | "neutral";
}

export interface LeadFlowWeek {
  week: string;
  [source: string]: string | number;
}

export interface WonRevenueMonth {
  month: string;
  value: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FunnelData {
  current: FunnelStage[];
  previous: FunnelStage[];
}

export interface TopPerformer {
  owner_id: string;
  name: string;
  won_value: number;
  deal_count: number;
  win_rate: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface StageDurationData {
  stage_name: string;
  stage_color: string;
  position: number;
  avg_days: number;
  min_days: number;
  max_days: number;
  deal_count: number;
  expected_days: number;
  heat_ratio: number;
}

export interface SalesVelocity {
  deals: number;
  avgValue: number;
  winRate: number;
  avgCycleDays: number;
  velocity: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function useSalesPerformance() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["sales-performance", workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      const now = new Date();
      const currentQuarterStart = startOfQuarter(now);
      const previousQuarterStart = startOfQuarter(subQuarters(now, 1));
      const twelveWeeksAgo = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 12);
      const twelveMonthsAgo = subMonths(startOfMonth(now), 12);

      // Fetch all data in parallel
      const [
        { data: opportunities },
        { data: leads },
        { data: proposals },
        { data: stages },
        { data: profiles },
      ] = await Promise.all([
        workspaceClient
          .from("opportunities")
          .select("id, title, value, stage_id, owner_id, status, created_at, updated_at, expected_close_date, lead_id")
          .eq("workspace_id", workspaceId),
        workspaceClient
          .from("leads")
          .select("id, source, created_at, status")
          .eq("workspace_id", workspaceId)
          .gte("created_at", twelveWeeksAgo.toISOString()),
        workspaceClient
          .from("proposals")
          .select("id, status, created_at")
          .eq("workspace_id", workspaceId),
        workspaceClient
          .from("pipeline_stages")
          .select("id, name, color, position, probability, expected_days")
          .eq("workspace_id", workspaceId)
          .order("position"),
        workspaceClient
          .from("profiles")
          .select("id, full_name, avatar_url"),
      ]);

      const opps = opportunities || [];
      const allLeads = leads || [];
      const allProposals = proposals || [];
      const allStages = stages || [];
      const allProfiles = profiles || [];

      const profileMap = new Map(allProfiles.map((p: any) => [p.id, p]));

      // --- KPIs ---
      const activeOpps = opps.filter((o: any) => o.status !== "closed_won" && o.status !== "closed_lost");
      const wonOpps = opps.filter((o: any) => o.status === "closed_won");
      const lostOpps = opps.filter((o: any) => o.status === "closed_lost");
      
      const totalPipeline = activeOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
      const wonRevenue = wonOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
      const winRate = (wonOpps.length + lostOpps.length) > 0
        ? (wonOpps.length / (wonOpps.length + lostOpps.length)) * 100
        : 0;

      const cycleDays = wonOpps
        .map((o: any) => differenceInDays(new Date(o.updated_at), new Date(o.created_at)))
        .filter((d: number) => d > 0);
      const avgCycleDays = cycleDays.length > 0
        ? Math.round(cycleDays.reduce((a: number, b: number) => a + b, 0) / cycleDays.length)
        : 0;

      const proposalsSent = allProposals.length;
      const proposalsAccepted = allProposals.filter((p: any) => p.status === "accepted").length;
      const proposalConversion = proposalsSent > 0 ? (proposalsAccepted / proposalsSent) * 100 : 0;

      const leadsTotal = allLeads.length;
      const leadsConverted = allLeads.filter((l: any) => l.status === "converted" || l.status === "qualified").length;
      const mqlToSql = leadsTotal > 0 ? (leadsConverted / leadsTotal) * 100 : 0;

      const kpis: SalesKPI[] = [
        { label: "pipeline_value", value: totalPipeline, formatted: formatCurrency(totalPipeline), trend: 0, trendDirection: "neutral" },
        { label: "won_revenue", value: wonRevenue, formatted: formatCurrency(wonRevenue), trend: 0, trendDirection: "up" },
        { label: "win_rate", value: winRate, formatted: `${winRate.toFixed(1)}%`, trend: 0, trendDirection: "neutral" },
        { label: "avg_cycle", value: avgCycleDays, formatted: `${avgCycleDays}d`, trend: 0, trendDirection: "neutral" },
        { label: "proposal_conversion", value: proposalConversion, formatted: `${proposalConversion.toFixed(1)}%`, trend: 0, trendDirection: "neutral" },
        { label: "mql_to_sql", value: mqlToSql, formatted: `${mqlToSql.toFixed(1)}%`, trend: 0, trendDirection: "neutral" },
      ];

      // --- Weekly Lead Flow by Source ---
      const sourceSet = new Set<string>();
      const weekBuckets: Record<string, Record<string, number>> = {};
      
      for (let i = 0; i < 12; i++) {
        const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11 - i);
        const key = format(weekStart, "dd/MM");
        weekBuckets[key] = {};
      }

      allLeads.forEach((lead: any) => {
        const src = lead.source || "direct";
        sourceSet.add(src);
        const ws = startOfWeek(new Date(lead.created_at), { weekStartsOn: 1 });
        const key = format(ws, "dd/MM");
        if (weekBuckets[key]) {
          weekBuckets[key][src] = (weekBuckets[key][src] || 0) + 1;
        }
      });

      const sources = Array.from(sourceSet);
      const leadFlow: LeadFlowWeek[] = Object.entries(weekBuckets).map(([week, data]) => ({
        week,
        ...sources.reduce((acc, src) => ({ ...acc, [src]: data[src] || 0 }), {}),
      }));

      // --- Won Revenue by Month ---
      const wonRevenueByMonth: WonRevenueMonth[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = subMonths(startOfMonth(now), i);
        const monthKey = format(monthStart, "MMM yy");
        const monthOpps = wonOpps.filter((o: any) => {
          const d = new Date(o.updated_at);
          return d.getFullYear() === monthStart.getFullYear() && d.getMonth() === monthStart.getMonth();
        });
        wonRevenueByMonth.push({
          month: monthKey,
          value: monthOpps.reduce((s: number, o: any) => s + (o.value || 0), 0),
        });
      }

      // --- ARR Trend (cumulative won revenue) ---
      let cumulative = 0;
      const arrTrend = wonRevenueByMonth.map((m) => {
        cumulative += m.value;
        return { month: m.month, value: cumulative };
      });

      // --- Conversion Funnel ---
      const buildFunnel = (filterFn: (o: any) => boolean): FunnelStage[] => {
        const filtered = opps.filter(filterFn);
        const total = filtered.length || 1;
        return allStages.map((stage: any) => ({
          name: stage.name,
          count: filtered.filter((o: any) => o.stage_id === stage.id).length,
          percentage: Math.round((filtered.filter((o: any) => o.stage_id === stage.id).length / total) * 100),
          color: stage.color || "hsl(var(--primary))",
        }));
      };

      const funnel: FunnelData = {
        current: buildFunnel((o: any) => new Date(o.created_at) >= currentQuarterStart),
        previous: buildFunnel((o: any) => {
          const d = new Date(o.created_at);
          return d >= previousQuarterStart && d < currentQuarterStart;
        }),
      };

      // --- Sales Velocity ---
      const velocity: SalesVelocity = {
        deals: activeOpps.length,
        avgValue: activeOpps.length > 0 ? activeOpps.reduce((s: number, o: any) => s + (o.value || 0), 0) / activeOpps.length : 0,
        winRate,
        avgCycleDays: avgCycleDays || 1,
        velocity: avgCycleDays > 0
          ? (activeOpps.length * (activeOpps.length > 0 ? activeOpps.reduce((s: number, o: any) => s + (o.value || 0), 0) / activeOpps.length : 0) * (winRate / 100)) / avgCycleDays
          : 0,
      };

      // --- Top Performers ---
      const ownerMap = new Map<string, { won_value: number; deal_count: number; total: number }>();
      opps.forEach((o: any) => {
        if (!o.owner_id) return;
        const entry = ownerMap.get(o.owner_id) || { won_value: 0, deal_count: 0, total: 0 };
        entry.total++;
        if (o.status === "closed_won") {
          entry.won_value += o.value || 0;
          entry.deal_count++;
        }
        ownerMap.set(o.owner_id, entry);
      });

      const topPerformers: TopPerformer[] = Array.from(ownerMap.entries())
        .map(([owner_id, data]) => ({
          owner_id,
          name: (profileMap.get(owner_id) as any)?.full_name || "Unknown",
          won_value: data.won_value,
          deal_count: data.deal_count,
          win_rate: data.total > 0 ? (data.deal_count / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.won_value - a.won_value)
        .slice(0, 5);

      // --- Source Breakdown ---
      const srcMap = new Map<string, number>();
      allLeads.forEach((l: any) => {
        const src = l.source || "direct";
        srcMap.set(src, (srcMap.get(src) || 0) + 1);
      });
      const totalLeads = allLeads.length || 1;
      const sourceBreakdown: SourceBreakdown[] = Array.from(srcMap.entries())
        .map(([source, count]) => ({
          source,
          count,
          percentage: Math.round((count / totalLeads) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // --- Stage Duration Heatmap ---
      const stageDuration: StageDurationData[] = allStages.map((stage: any) => {
        const stageOpps = opps.filter((o: any) => o.stage_id === stage.id);
        const days = stageOpps.map((o: any) => {
          const end = (o.status === "closed_won" || o.status === "closed_lost") ? new Date(o.updated_at) : now;
          return Math.max(differenceInDays(end, new Date(o.created_at)), 0);
        });
        const avg = days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 0;
        const expectedDays = stage.expected_days || 7;
        return {
          stage_name: stage.name,
          stage_color: stage.color || "hsl(var(--primary))",
          position: stage.position,
          avg_days: avg,
          min_days: days.length > 0 ? Math.min(...days) : 0,
          max_days: days.length > 0 ? Math.max(...days) : 0,
          deal_count: stageOpps.length,
          expected_days: expectedDays,
          heat_ratio: expectedDays > 0 ? avg / expectedDays : 0,
        };
      }).filter(s => s.deal_count > 0).sort((a, b) => a.position - b.position);

      return {
        kpis,
        leadFlow,
        sources,
        wonRevenueByMonth,
        arrTrend,
        funnel,
        velocity,
        topPerformers,
        sourceBreakdown,
        stageDuration,
        activeDeals: activeOpps.length,
        totalPipeline,
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}
