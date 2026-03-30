import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { subDays, startOfDay, format } from "date-fns";

export type CSATPeriod = "7d" | "30d" | "90d" | "all";

export interface CSATMetrics {
  avgRating: number;
  totalRatings: number;
  positivePercent: number;
  nps: number;
  distribution: { star: number; count: number }[];
  trend: { date: string; avg: number; count: number }[];
  byAgent: { agent_id: string; avg: number; count: number }[];
  byType: { type: string; avg: number; count: number }[];
  recentRatings: {
    id: string;
    ticket_number: string;
    satisfaction_rating: number;
    assigned_to: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
}

export function useCSATDashboard(period: CSATPeriod = "30d") {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["csat_dashboard", wid, period],
    queryFn: async (): Promise<CSATMetrics> => {
      let query = (supabase as any)
        .from("client_tickets")
        .select("id, ticket_number, satisfaction_rating, assigned_to, status, created_at, updated_at, ticket_type, priority")
        .eq("workspace_id", wid)
        .not("satisfaction_rating", "is", null);

      if (period !== "all") {
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = startOfDay(subDays(new Date(), days)).toISOString();
        query = query.gte("created_at", since);
      }

      const { data, error } = await query.order("updated_at", { ascending: false }).limit(1000);
      if (error) throw error;

      const tickets = (data ?? []) as any[];

      // Distribution
      const dist = [1, 2, 3, 4, 5].map((star) => ({
        star,
        count: tickets.filter((t) => t.satisfaction_rating === star).length,
      }));

      // Avg
      const total = tickets.length;
      const sum = tickets.reduce((s, t) => s + (t.satisfaction_rating || 0), 0);
      const avg = total > 0 ? sum / total : 0;

      // Positive %
      const positive = tickets.filter((t) => t.satisfaction_rating >= 4).length;
      const positivePercent = total > 0 ? (positive / total) * 100 : 0;

      // NPS (promoters 5, detractors 1-2)
      const promoters = tickets.filter((t) => t.satisfaction_rating === 5).length;
      const detractors = tickets.filter((t) => t.satisfaction_rating <= 2).length;
      const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

      // Trend (group by day)
      const trendMap: Record<string, { sum: number; count: number }> = {};
      tickets.forEach((t) => {
        const day = format(new Date(t.created_at), "yyyy-MM-dd");
        if (!trendMap[day]) trendMap[day] = { sum: 0, count: 0 };
        trendMap[day].sum += t.satisfaction_rating;
        trendMap[day].count++;
      });
      const trend = Object.entries(trendMap)
        .map(([date, v]) => ({ date, avg: v.sum / v.count, count: v.count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // By agent
      const agentMap: Record<string, { sum: number; count: number }> = {};
      tickets.forEach((t) => {
        if (!t.assigned_to) return;
        if (!agentMap[t.assigned_to]) agentMap[t.assigned_to] = { sum: 0, count: 0 };
        agentMap[t.assigned_to].sum += t.satisfaction_rating;
        agentMap[t.assigned_to].count++;
      });
      const byAgent = Object.entries(agentMap)
        .map(([agent_id, v]) => ({ agent_id, avg: v.sum / v.count, count: v.count }))
        .sort((a, b) => b.avg - a.avg);

      // By type
      const typeMap: Record<string, { sum: number; count: number }> = {};
      tickets.forEach((t) => {
        const type = t.ticket_type || "Sem tipo";
        if (!typeMap[type]) typeMap[type] = { sum: 0, count: 0 };
        typeMap[type].sum += t.satisfaction_rating;
        typeMap[type].count++;
      });
      const byType = Object.entries(typeMap)
        .map(([type, v]) => ({ type, avg: v.sum / v.count, count: v.count }))
        .sort((a, b) => b.count - a.count);

      // Recent ratings
      const recentRatings = tickets.slice(0, 10).map((t) => ({
        id: t.id,
        ticket_number: t.ticket_number || "-",
        satisfaction_rating: t.satisfaction_rating,
        assigned_to: t.assigned_to,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      return {
        avgRating: Math.round(avg * 100) / 100,
        totalRatings: total,
        positivePercent: Math.round(positivePercent * 10) / 10,
        nps,
        distribution: dist,
        trend,
        byAgent,
        byType,
        recentRatings,
      };
    },
    enabled: !!wid,
    staleTime: 30_000,
  });
}
