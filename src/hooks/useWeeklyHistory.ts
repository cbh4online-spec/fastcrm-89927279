import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface WeekBounds {
  start: string;
  end: string;
  startDate: string;
  label: string;
}

export interface WeekHistoryEntry {
  weekLabel: string;
  metrics: Record<string, { target: number; actual: number }>;
}

function getLast4WeekBounds(): WeekBounds[] {
  const weeks: WeekBounds[] = [];
  const now = new Date();
  const day = now.getDay();
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  currentMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    weeks.push({
      start: monday.toISOString(),
      end: sunday.toISOString(),
      startDate: monday.toISOString().split("T")[0],
      label: `${monday.getDate()}/${monday.getMonth() + 1}`,
    });
  }
  return weeks.reverse(); // oldest first
}

export function useWeeklyHistory() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["weekly-history", wid],
    enabled: !!wid,
    refetchInterval: 120_000,
    queryFn: async (): Promise<WeekHistoryEntry[]> => {
      const weeks = getLast4WeekBounds();

      const results: WeekHistoryEntry[] = [];

      for (const week of weeks) {
        const [targetsRes, leadsRes, meetingsRes, calendarRes, proposalsRes, oppsRes, wonRes] =
          await Promise.all([
            supabase
              .from("performance_targets")
              .select("metric_type, target_value")
              .eq("workspace_id", wid!)
              .eq("period_type", "weekly")
              .lte("period_start", week.startDate)
              .gte("period_end", week.startDate),
            supabase
              .from("leads")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid!)
              .gte("created_at", week.start)
              .lte("created_at", week.end),
            supabase
              .from("meetings")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid!)
              .gte("created_at", week.start)
              .lte("created_at", week.end),
            supabase
              .from("calendar_events")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid!)
              .gte("created_at", week.start)
              .lte("created_at", week.end),
            supabase
              .from("proposals")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid!)
              .eq("status", "published")
              .gte("created_at", week.start)
              .lte("created_at", week.end),
            supabase
              .from("opportunities")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid!)
              .gte("created_at", week.start)
              .lte("created_at", week.end),
            supabase
              .from("opportunities")
              .select("id, value")
              .eq("workspace_id", wid!)
              .eq("status", "won")
              .gte("updated_at", week.start)
              .lte("updated_at", week.end),
          ]);

        const tMap: Record<string, number> = {};
        (targetsRes.data || []).forEach((t: any) => {
          tMap[t.metric_type] = Number(t.target_value);
        });

        const revenue = (wonRes.data || []).reduce((s: number, d: any) => s + (d.value || 0), 0);
        const totalMeetings = (meetingsRes.count || 0) + (calendarRes.count || 0);

        results.push({
          weekLabel: week.label,
          metrics: {
            revenue: { target: tMap.revenue || 0, actual: revenue },
            leads: { target: tMap.leads || 0, actual: leadsRes.count || 0 },
            meetings: { target: tMap.meetings || 0, actual: totalMeetings },
            proposals: { target: tMap.proposals || 0, actual: proposalsRes.count || 0 },
            deals: { target: tMap.deals || 0, actual: oppsRes.count || 0 },
          },
        });
      }

      return results;
    },
  });
}
