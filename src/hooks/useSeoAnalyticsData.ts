import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SeoAnalyticsEvent {
  event_type: string;
  event_data: Record<string, unknown> | null;
  page_type: string | null;
  page_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  visitor_id: string | null;
  session_id: string | null;
  created_at: string;
}

export function useSeoAnalyticsData(days = 30) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["seo-analytics", workspaceId, days],
    queryFn: async () => {
      if (!workspaceId) return [];

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("seo_page_analytics")
        .select("event_type, event_data, page_type, page_url, referrer, utm_source, utm_medium, utm_campaign, device_type, visitor_id, session_id, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data || []) as unknown as SeoAnalyticsEvent[];
    },
    enabled: !!workspaceId,
  });
}

/** Group events by week for timeline charts */
export function groupByWeek(events: SeoAnalyticsEvent[]) {
  const weeks = new Map<string, { sessions: Set<string>; pageViews: number; ctaClicks: number }>();

  for (const e of events) {
    const d = new Date(e.created_at);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().split("T")[0];

    if (!weeks.has(key)) {
      weeks.set(key, { sessions: new Set(), pageViews: 0, ctaClicks: 0 });
    }
    const w = weeks.get(key)!;

    if (e.session_id) w.sessions.add(e.session_id);
    if (e.event_type === "page_view") w.pageViews++;
    if (e.event_type === "cta_click") w.ctaClicks++;
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: formatWeekLabel(date),
      sessions: v.sessions.size,
      pageViews: v.pageViews,
      generateStarted: v.ctaClicks,
    }));
}

/** Group events by page_type */
export function groupByPageType(events: SeoAnalyticsEvent[]) {
  const types = new Map<string, { sessions: Set<string>; ctaClicks: number }>();

  for (const e of events) {
    const pt = e.page_type || "other";
    if (!types.has(pt)) types.set(pt, { sessions: new Set(), ctaClicks: 0 });
    const t = types.get(pt)!;
    if (e.session_id) t.sessions.add(e.session_id);
    if (e.event_type === "cta_click") t.ctaClicks++;
  }

  return Array.from(types.entries()).map(([type, v]) => ({
    type,
    sessions: v.sessions.size,
    activated: v.ctaClicks,
    rate: v.sessions.size > 0 ? Math.round((v.ctaClicks / v.sessions.size) * 1000) / 10 : 0,
  }));
}

/** Build funnel steps from events */
export function buildFunnelFromEvents(events: SeoAnalyticsEvent[]) {
  const uniqueVisitors = new Set(events.filter(e => e.visitor_id).map(e => e.visitor_id!));
  const pageViewSessions = new Set(events.filter(e => e.event_type === "page_view" && e.session_id).map(e => e.session_id!));
  const scrolledSessions = new Set(events.filter(e => e.event_type === "scroll_depth" && e.session_id).map(e => e.session_id!));
  const ctaSessions = new Set(events.filter(e => e.event_type === "cta_click" && e.session_id).map(e => e.session_id!));

  const steps = [
    { name: "Visitantes Únicos", count: uniqueVisitors.size, dropoff: 0 },
    { name: "Page Views", count: pageViewSessions.size, dropoff: 0 },
    { name: "Scroll > 50%", count: scrolledSessions.size, dropoff: 0 },
    { name: "CTA Clicado", count: ctaSessions.size, dropoff: 0 },
  ];

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].count;
    steps[i].dropoff = prev > 0 ? Math.round((1 - steps[i].count / prev) * 1000) / 10 : 0;
  }

  return steps;
}

/** Build audience segments from events */
export function buildAudienceSegments(events: SeoAnalyticsEvent[]) {
  const scrolled = new Set<string>();
  const clicked = new Set<string>();
  const viewedOnly = new Set<string>();

  for (const e of events) {
    if (!e.visitor_id) continue;
    if (e.event_type === "cta_click") clicked.add(e.visitor_id);
    else if (e.event_type === "scroll_depth") scrolled.add(e.visitor_id);
    else if (e.event_type === "page_view") viewedOnly.add(e.visitor_id);
  }

  return [
    {
      id: "scrolled_not_clicked",
      name: "Scrolled sem clicar CTA",
      description: "Leram conteúdo mas não converteram",
      size: [...scrolled].filter(v => !clicked.has(v)).length,
      conversionPotential: "high" as const,
      suggestedAction: "Retargeting com CTA mais visível",
    },
    {
      id: "clicked_cta",
      name: "Clicaram CTA",
      description: "Mostraram intenção de conversão",
      size: clicked.size,
      conversionPotential: "very-high" as const,
      suggestedAction: "Follow-up personalizado",
    },
    {
      id: "bounced",
      name: "Apenas visualizaram",
      description: "Visitaram mas não interagiram",
      size: [...viewedOnly].filter(v => !scrolled.has(v) && !clicked.has(v)).length,
      conversionPotential: "low" as const,
      suggestedAction: "Melhorar conteúdo acima da dobra",
    },
  ];
}

function formatWeekLabel(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${day} ${months[d.getMonth()]}`;
}
