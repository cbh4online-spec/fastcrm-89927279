import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CtaRanking {
  step_id: string;
  step_name: string;
  clicks: number;
  views: number;
  ctr: number;
}

export interface UtmBreakdown {
  source: string;
  sessions: number;
  leads: number;
  conversion_rate: number;
}

export function useFunnelCtaRanking(funnelId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["funnel-cta-ranking", funnelId, dateFrom, dateTo],
    queryFn: async (): Promise<CtaRanking[]> => {
      if (!funnelId) return [];

      let q = sb.from("funnel_events").select("step_id, event_type").eq("funnel_id", funnelId).in("event_type", ["step_view", "cta_clicked"]);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59");
      const { data: events = [] } = await q;

      // Get step names
      const { data: steps = [] } = await sb.from("funnel_steps").select("id, name").eq("funnel_id", funnelId);
      const stepMap = Object.fromEntries(steps.map((s: any) => [s.id, s.name]));

      const byStep: Record<string, { clicks: number; views: number }> = {};
      for (const ev of events) {
        if (!ev.step_id) continue;
        if (!byStep[ev.step_id]) byStep[ev.step_id] = { clicks: 0, views: 0 };
        if (ev.event_type === "cta_clicked") byStep[ev.step_id].clicks++;
        else byStep[ev.step_id].views++;
      }

      return Object.entries(byStep)
        .map(([step_id, { clicks, views }]) => ({
          step_id,
          step_name: stepMap[step_id] || step_id.slice(0, 8),
          clicks,
          views,
          ctr: views > 0 ? (clicks / views) * 100 : 0,
        }))
        .sort((a, b) => b.ctr - a.ctr);
    },
    enabled: !!funnelId,
  });
}

export function useFunnelUtmBreakdown(funnelId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["funnel-utm-breakdown", funnelId, dateFrom, dateTo],
    queryFn: async (): Promise<UtmBreakdown[]> => {
      if (!funnelId) return [];

      // Get sessions with UTM
      let evQ = sb.from("funnel_events").select("session_id, utm_source, event_type").eq("funnel_id", funnelId);
      if (dateFrom) evQ = evQ.gte("created_at", dateFrom);
      if (dateTo) evQ = evQ.lte("created_at", dateTo + "T23:59:59");
      const { data: events = [] } = await evQ;

      // Get submissions
      let subQ = sb.from("funnel_submissions").select("session_id, utm_source").eq("funnel_id", funnelId);
      if (dateFrom) subQ = subQ.gte("created_at", dateFrom);
      if (dateTo) subQ = subQ.lte("created_at", dateTo + "T23:59:59");
      const { data: subs = [] } = await subQ;

      const submissionSessions = new Set(subs.map((s: any) => s.session_id));

      const bySource: Record<string, { sessions: Set<string>; leads: number }> = {};
      for (const ev of events) {
        const src = ev.utm_source || "(direto)";
        if (!bySource[src]) bySource[src] = { sessions: new Set(), leads: 0 };
        if (ev.session_id) bySource[src].sessions.add(ev.session_id);
      }

      // Count leads per source
      for (const sub of subs) {
        const src = sub.utm_source || "(direto)";
        if (!bySource[src]) bySource[src] = { sessions: new Set(), leads: 0 };
        bySource[src].leads++;
      }

      return Object.entries(bySource)
        .map(([source, { sessions, leads }]) => ({
          source,
          sessions: sessions.size,
          leads,
          conversion_rate: sessions.size > 0 ? (leads / sessions.size) * 100 : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);
    },
    enabled: !!funnelId,
  });
}
