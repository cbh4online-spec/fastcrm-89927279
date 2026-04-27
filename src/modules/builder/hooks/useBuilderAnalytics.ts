import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuilderEvent {
  id: string;
  asset_id: string;
  event_type: "view" | "click" | "form_submit" | "custom";
  hostname: string | null;
  path: string | null;
  referrer: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BuilderAnalyticsSummary {
  totalViews: number;
  uniqueSessions: number;
  totalClicks: number;
  totalFormSubmits: number;
  conversionRate: number;
  byDay: { date: string; views: number; sessions: number; conversions: number }[];
  topReferrers: { referrer: string; count: number }[];
  topPaths: { path: string; count: number }[];
}

const DAYS = 30;

export function useBuilderAnalytics(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-analytics", assetId, DAYS],
    queryFn: async (): Promise<BuilderAnalyticsSummary> => {
      if (!assetId) {
        return {
          totalViews: 0,
          uniqueSessions: 0,
          totalClicks: 0,
          totalFormSubmits: 0,
          conversionRate: 0,
          byDay: [],
          topReferrers: [],
          topPaths: [],
        };
      }

      const since = new Date(Date.now() - DAYS * 86400_000).toISOString();
      const { data, error } = await (supabase as any)
        .from("builder_page_events")
        .select("event_type, session_id, referrer, path, created_at")
        .eq("asset_id", assetId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(10000);

      if (error) throw error;
      const rows = (data ?? []) as Array<{
        event_type: BuilderEvent["event_type"];
        session_id: string | null;
        referrer: string | null;
        path: string | null;
        created_at: string;
      }>;

      const sessions = new Set<string>();
      const refMap = new Map<string, number>();
      const pathMap = new Map<string, number>();
      const dayMap = new Map<
        string,
        { views: number; sessions: Set<string>; conversions: number }
      >();
      let views = 0;
      let clicks = 0;
      let forms = 0;

      for (const r of rows) {
        const day = r.created_at.slice(0, 10);
        if (!dayMap.has(day))
          dayMap.set(day, { views: 0, sessions: new Set(), conversions: 0 });
        const bucket = dayMap.get(day)!;

        if (r.event_type === "view") {
          views++;
          bucket.views++;
          if (r.session_id) {
            sessions.add(r.session_id);
            bucket.sessions.add(r.session_id);
          }
          const ref = (r.referrer || "(direto)").replace(/^https?:\/\//, "").split("/")[0] || "(direto)";
          refMap.set(ref, (refMap.get(ref) ?? 0) + 1);
          const p = r.path || "/";
          pathMap.set(p, (pathMap.get(p) ?? 0) + 1);
        } else if (r.event_type === "click") {
          clicks++;
        } else if (r.event_type === "form_submit") {
          forms++;
          bucket.conversions++;
        }
      }

      const byDay: BuilderAnalyticsSummary["byDay"] = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        const b = dayMap.get(d);
        byDay.push({
          date: d,
          views: b?.views ?? 0,
          sessions: b?.sessions.size ?? 0,
          conversions: b?.conversions ?? 0,
        });
      }

      const topReferrers = [...refMap.entries()]
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topPaths = [...pathMap.entries()]
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalViews: views,
        uniqueSessions: sessions.size,
        totalClicks: clicks,
        totalFormSubmits: forms,
        conversionRate: views > 0 ? (forms / views) * 100 : 0,
        byDay,
        topReferrers,
        topPaths,
      };
    },
    enabled: !!assetId,
    staleTime: 30_000,
  });
}
