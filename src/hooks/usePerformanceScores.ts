import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface PerformanceScore {
  id: string;
  workspace_id: string;
  user_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  revenue_generated: number;
  pipeline_generated: number;
  meetings_booked: number;
  proposals_sent: number;
  leads_generated: number;
  conversion_rate: number;
  score_total: number;
  created_at: string;
  updated_at: string;
}

// Default KPI weights
export const DEFAULT_KPI_WEIGHTS = {
  revenue_generated: 0.40,
  pipeline_generated: 0.20,
  meetings_booked: 0.15,
  proposals_sent: 0.10,
  leads_generated: 0.10,
  followups_completed: 0.05,
};

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString().split("T")[0], end: sunday.toISOString().split("T")[0] };
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

export function usePerformanceScores(periodType: "weekly" | "monthly" = "weekly") {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["performance-scores", wid, periodType],
    enabled: !!wid,
    refetchInterval: 60_000,
    queryFn: async () => {
      const bounds = periodType === "weekly" ? getWeekBounds() : getMonthBounds();
      
      const { data, error } = await supabase
        .from("performance_scores")
        .select("*")
        .eq("workspace_id", wid!)
        .eq("period_type", periodType)
        .eq("period_start", bounds.start)
        .order("score_total", { ascending: false });

      if (error) throw error;
      return (data || []) as PerformanceScore[];
    },
  });
}

export function useLeaderboard(metric: string = "score_total", periodType: "weekly" | "monthly" = "weekly") {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leaderboard", wid, metric, periodType],
    enabled: !!wid,
    refetchInterval: 30_000,
    queryFn: async () => {
      const bounds = periodType === "weekly" ? getWeekBounds() : getMonthBounds();

      const { data: scores, error } = await supabase
        .from("performance_scores")
        .select("*")
        .eq("workspace_id", wid!)
        .eq("period_type", periodType)
        .eq("period_start", bounds.start)
        .order(metric as any, { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles
      const userIds = (scores || []).map((s: any) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (scores || []).map((s: any, idx: number) => ({
        ...s,
        rank: idx + 1,
        user_name: profileMap.get(s.user_id)?.full_name || "Utilizador",
        avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
      }));
    },
  });
}

export function useRecalculateScores() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodType: "weekly" | "monthly") => {
      const wid = currentWorkspace?.id;
      if (!wid) throw new Error("No workspace");

      const bounds = periodType === "weekly" ? getWeekBounds() : getMonthBounds();
      const startISO = new Date(bounds.start).toISOString();
      const endISO = new Date(bounds.end + "T23:59:59").toISOString();

      // Get workspace members
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", wid);

      if (!members?.length) return;

      for (const member of members) {
        const uid = member.user_id;

        const [leadsRes, meetingsRes, proposalsRes, oppsRes, pipelineRes] = await Promise.all([
          supabase.from("leads").select("id", { count: "exact", head: true })
            .eq("workspace_id", wid).gte("created_at", startISO).lte("created_at", endISO),
          supabase.from("meetings").select("id", { count: "exact", head: true })
            .eq("workspace_id", wid).gte("created_at", startISO).lte("created_at", endISO),
          supabase.from("proposals").select("id", { count: "exact", head: true })
            .eq("workspace_id", wid).eq("status", "published").gte("created_at", startISO).lte("created_at", endISO),
          supabase.from("opportunities").select("id, value")
            .eq("workspace_id", wid).eq("status", "won").gte("updated_at", startISO).lte("updated_at", endISO),
          supabase.from("opportunities").select("id, value")
            .eq("workspace_id", wid).in("status", ["open", "active", "negotiation"]).gte("created_at", startISO).lte("created_at", endISO),
        ]);

        const revenue = (oppsRes.data || []).reduce((s, d: any) => s + (d.value || 0), 0);
        const pipeline = (pipelineRes.data || []).reduce((s, d: any) => s + (d.value || 0), 0);
        const meetings = meetingsRes.count || 0;
        const proposals = proposalsRes.count || 0;
        const leads = leadsRes.count || 0;
        const totalDeals = (oppsRes.data || []).length;
        const convRate = leads > 0 ? (totalDeals / leads) * 100 : 0;

        // Weighted score (normalized)
        const score = 
          (revenue > 0 ? 40 : 0) +
          (pipeline > 0 ? Math.min(pipeline / 10000, 1) * 20 : 0) +
          (meetings * 3) +
          (proposals * 5) +
          (leads * 2) +
          (convRate * 0.5);

        await supabase.from("performance_scores").upsert({
          workspace_id: wid,
          user_id: uid,
          period_type: periodType,
          period_start: bounds.start,
          period_end: bounds.end,
          revenue_generated: revenue,
          pipeline_generated: pipeline,
          meetings_booked: meetings,
          proposals_sent: proposals,
          leads_generated: leads,
          conversion_rate: Math.round(convRate * 100) / 100,
          score_total: Math.round(score * 100) / 100,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,user_id,period_type,period_start" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-scores"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
