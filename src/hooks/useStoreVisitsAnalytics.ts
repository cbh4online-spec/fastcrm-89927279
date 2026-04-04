import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, parseISO, startOfDay } from "date-fns";

interface DailyVisit {
  date: string;
  views: number;
  sessions: number;
}

interface DeviceBreakdown {
  device: string;
  count: number;
  percentage: number;
}

interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  converted: number;
  conversionRate: number;
}

interface TopPage {
  productId: string;
  productName: string;
  views: number;
}

interface ReferrerEntry {
  referrer: string;
  sessions: number;
}

interface AiIntentEntry {
  intent: string;
  count: number;
  percentage: number;
}

interface ScrollDepthBucket {
  range: string;
  count: number;
  percentage: number;
}

interface ExitPageEntry {
  page: string;
  exits: number;
  percentage: number;
}

interface VisitsKPIs {
  totalViews: number;
  uniqueSessions: number;
  pagesPerSession: number;
  avgTimeOnSite: number;
  bounceRate: number;
  conversionRate: number;
  avgScrollDepth: number;
}

export function useStoreVisitsAnalytics(days: number) {
  const cutoff = format(subDays(new Date(), days), "yyyy-MM-dd");

  const pageViewsQuery = useQuery({
    queryKey: ["store-visits-pageviews", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_page_views" as any)
        .select("id, product_id, session_id, created_at")
        .gte("created_at", cutoff);
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        product_id: string | null;
        session_id: string | null;
        created_at: string;
      }>;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["store-visits-sessions", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_visitor_sessions" as any)
        .select("*")
        .gte("started_at", cutoff);
      if (error) throw error;
      return (data || []) as unknown as Array<{
        session_id: string;
        pages_viewed: number;
        time_on_site_seconds: number;
        device_type: string | null;
        referrer: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        converted: boolean | null;
        ai_intent: string | null;
        started_at: string;
        products_viewed: string[] | null;
        scroll_depth_max: number | null;
        exit_page: string | null;
        pages_history: string[] | null;
      }>;
    },
  });

  // Fetch product names for top pages
  const productNamesQuery = useQuery({
    queryKey: ["store-visits-product-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  const isLoading = pageViewsQuery.isLoading || sessionsQuery.isLoading || productNamesQuery.isLoading;

  const views = pageViewsQuery.data || [];
  const sessions = sessionsQuery.data || [];
  const productMap = new Map((productNamesQuery.data || []).map((p) => [p.id, p.name]));

  // KPIs
  const totalViews = views.length;
  const uniqueSessions = sessions.length;
  const pagesPerSession = uniqueSessions > 0 ? totalViews / uniqueSessions : 0;
  const avgTimeOnSite = uniqueSessions > 0
    ? sessions.reduce((s, x) => s + (x.time_on_site_seconds || 0), 0) / uniqueSessions
    : 0;
  const bounceSessions = sessions.filter((s) => (s.pages_viewed || 0) <= 1).length;
  const bounceRate = uniqueSessions > 0 ? (bounceSessions / uniqueSessions) * 100 : 0;
  const convertedSessions = sessions.filter((s) => s.converted).length;
  const conversionRate = uniqueSessions > 0 ? (convertedSessions / uniqueSessions) * 100 : 0;

  const kpis: VisitsKPIs = {
    totalViews,
    uniqueSessions,
    pagesPerSession,
    avgTimeOnSite,
    bounceRate,
    conversionRate,
  };

  // Daily visits
  const dailyMap = new Map<string, { views: number; sessionSet: Set<string> }>();
  for (const v of views) {
    const day = format(startOfDay(parseISO(v.created_at)), "yyyy-MM-dd");
    if (!dailyMap.has(day)) dailyMap.set(day, { views: 0, sessionSet: new Set() });
    const entry = dailyMap.get(day)!;
    entry.views++;
    if (v.session_id) entry.sessionSet.add(v.session_id);
  }
  const dailyVisits: DailyVisit[] = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, views: d.views, sessions: d.sessionSet.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Device breakdown
  const deviceMap = new Map<string, number>();
  for (const s of sessions) {
    const d = s.device_type || "desconhecido";
    deviceMap.set(d, (deviceMap.get(d) || 0) + 1);
  }
  const deviceBreakdown: DeviceBreakdown[] = Array.from(deviceMap.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: uniqueSessions > 0 ? (count / uniqueSessions) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Traffic sources
  const srcMap = new Map<string, { sessions: number; converted: number }>();
  for (const s of sessions) {
    const key = `${s.utm_source || "direto"}|${s.utm_medium || "-"}`;
    if (!srcMap.has(key)) srcMap.set(key, { sessions: 0, converted: 0 });
    const e = srcMap.get(key)!;
    e.sessions++;
    if (s.converted) e.converted++;
  }
  const trafficSources: TrafficSource[] = Array.from(srcMap.entries())
    .map(([key, d]) => {
      const [source, medium] = key.split("|");
      return {
        source,
        medium,
        sessions: d.sessions,
        converted: d.converted,
        conversionRate: d.sessions > 0 ? (d.converted / d.sessions) * 100 : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Top pages (products)
  const productViewMap = new Map<string, number>();
  for (const v of views) {
    if (v.product_id) {
      productViewMap.set(v.product_id, (productViewMap.get(v.product_id) || 0) + 1);
    }
  }
  const topPages: TopPage[] = Array.from(productViewMap.entries())
    .map(([productId, viewCount]) => ({
      productId,
      productName: productMap.get(productId) || productId.slice(0, 8),
      views: viewCount,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Referrers
  const refMap = new Map<string, number>();
  for (const s of sessions) {
    const ref = s.referrer || "Direto";
    try {
      const host = ref === "Direto" ? ref : new URL(ref).hostname;
      refMap.set(host, (refMap.get(host) || 0) + 1);
    } catch {
      refMap.set(ref, (refMap.get(ref) || 0) + 1);
    }
  }
  const referrers: ReferrerEntry[] = Array.from(refMap.entries())
    .map(([referrer, s]) => ({ referrer, sessions: s }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  // AI Intent
  const intentMap = new Map<string, number>();
  for (const s of sessions) {
    if (s.ai_intent) {
      intentMap.set(s.ai_intent, (intentMap.get(s.ai_intent) || 0) + 1);
    }
  }
  const totalIntents = Array.from(intentMap.values()).reduce((a, b) => a + b, 0);
  const aiIntents: AiIntentEntry[] = Array.from(intentMap.entries())
    .map(([intent, count]) => ({
      intent,
      count,
      percentage: totalIntents > 0 ? (count / totalIntents) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    kpis,
    dailyVisits,
    deviceBreakdown,
    trafficSources,
    topPages,
    referrers,
    aiIntents,
    isLoading,
  };
}
