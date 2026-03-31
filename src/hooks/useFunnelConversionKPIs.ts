import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface FunnelConversionKPIs {
  step_views: number;
  unique_sessions: number;
  form_starts: number;
  form_submits: number;
  form_failures: number;
  cta_clicks: number;
  funnel_completions: number;
  leads_captured: number;
  contacts_created: number;
  consent_given_count: number;
  marketing_optins: number;
  optin_rate: number;
  completion_rate: number;
  cta_ctr: number;
  byStep: Record<string, Record<string, number>>;
}

export function useFunnelConversionKPIs(funnelId: string | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["funnel-conversion-kpis", funnelId, dateFrom, dateTo],
    queryFn: async (): Promise<FunnelConversionKPIs> => {
      if (!funnelId) throw new Error("No funnel");

      // Fetch events
      let evQuery = sb.from("funnel_events").select("event_type, step_id, session_id").eq("funnel_id", funnelId);
      if (dateFrom) evQuery = evQuery.gte("created_at", dateFrom);
      if (dateTo) evQuery = evQuery.lte("created_at", dateTo + "T23:59:59");
      const { data: events = [] } = await evQuery;

      // Fetch submissions
      let subQuery = sb.from("funnel_submissions").select("id, contact_id, consent_given, marketing_opt_in").eq("funnel_id", funnelId);
      if (dateFrom) subQuery = subQuery.gte("created_at", dateFrom);
      if (dateTo) subQuery = subQuery.lte("created_at", dateTo + "T23:59:59");
      const { data: submissions = [] } = await subQuery;

      // Aggregate events
      const counts: Record<string, number> = {};
      const sessions = new Set<string>();
      const byStep: Record<string, Record<string, number>> = {};

      for (const ev of events) {
        counts[ev.event_type] = (counts[ev.event_type] || 0) + 1;
        if (ev.session_id) sessions.add(ev.session_id);
        if (ev.step_id) {
          if (!byStep[ev.step_id]) byStep[ev.step_id] = {};
          byStep[ev.step_id][ev.event_type] = (byStep[ev.step_id][ev.event_type] || 0) + 1;
        }
      }

      const step_views = counts["step_view"] || 0;
      const form_starts = counts["form_started"] || 0;
      const form_submits = counts["form_submit_success"] || 0;
      const form_failures = counts["form_submit_failed"] || 0;
      const cta_clicks = counts["cta_clicked"] || 0;
      const funnel_completions = counts["funnel_completed"] || 0;

      const leads_captured = submissions.length;
      const contacts_created = submissions.filter((s: any) => s.contact_id).length;
      const consent_given_count = submissions.filter((s: any) => s.consent_given).length;
      const marketing_optins = submissions.filter((s: any) => s.marketing_opt_in).length;

      return {
        step_views,
        unique_sessions: sessions.size,
        form_starts,
        form_submits,
        form_failures,
        cta_clicks,
        funnel_completions,
        leads_captured,
        contacts_created,
        consent_given_count,
        marketing_optins,
        optin_rate: step_views > 0 ? (leads_captured / step_views) * 100 : 0,
        completion_rate: step_views > 0 ? (funnel_completions / step_views) * 100 : 0,
        cta_ctr: step_views > 0 ? (cta_clicks / step_views) * 100 : 0,
        byStep,
      };
    },
    enabled: !!funnelId,
  });
}
