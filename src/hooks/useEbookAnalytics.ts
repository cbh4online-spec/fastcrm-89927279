import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EbookView {
  id: string;
  ebook_id: string;
  session_id: string;
  reader_email: string | null;
  reader_name: string | null;
  contact_id: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  device_type: string | null;
  pages_viewed: number;
  max_page_reached: number;
  total_pages: number;
  time_on_book_seconds: number;
  completed: boolean;
  started_at: string;
  last_activity_at: string;
}

export interface EbookPageEvent {
  id: string;
  ebook_view_id: string;
  page_number: number;
  event_type: string;
  duration_seconds: number;
  created_at: string;
}

export function useEbookViews(ebookId: string | undefined) {
  return useQuery({
    queryKey: ["ebook-views", ebookId],
    queryFn: async () => {
      if (!ebookId) return [];
      const { data, error } = await (supabase as any)
        .from("ebook_views")
        .select("*")
        .eq("ebook_id", ebookId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EbookView[];
    },
    enabled: !!ebookId,
  });
}

export function useEbookPageEvents(ebookId: string | undefined) {
  return useQuery({
    queryKey: ["ebook-page-events", ebookId],
    queryFn: async () => {
      if (!ebookId) return [];
      const { data, error } = await (supabase as any)
        .from("ebook_page_events")
        .select("*")
        .eq("ebook_id", ebookId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EbookPageEvent[];
    },
    enabled: !!ebookId,
  });
}

export function useEbookAnalyticsKPIs(ebookId: string | undefined) {
  const { data: views, isLoading: viewsLoading } = useEbookViews(ebookId);
  const { data: pageEvents, isLoading: eventsLoading } = useEbookPageEvents(ebookId);

  const totalViews = views?.length || 0;
  const uniqueReaders = new Set(views?.filter(v => v.reader_email).map(v => v.reader_email)).size;
  const anonymousViews = views?.filter(v => !v.reader_email).length || 0;
  const completedViews = views?.filter(v => v.completed).length || 0;
  const completionRate = totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0;
  const avgTimeSeconds = totalViews > 0
    ? Math.round((views?.reduce((s, v) => s + v.time_on_book_seconds, 0) || 0) / totalViews)
    : 0;

  // Page drop-off: count views per max_page_reached
  const pageDropOff: Record<number, number> = {};
  views?.forEach(v => {
    for (let i = 0; i <= v.max_page_reached; i++) {
      pageDropOff[i] = (pageDropOff[i] || 0) + 1;
    }
  });

  // Daily views (last 30 days)
  const dailyViews: Record<string, number> = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyViews[d.toISOString().split("T")[0]] = 0;
  }
  views?.forEach(v => {
    const day = v.started_at.split("T")[0];
    if (dailyViews[day] !== undefined) dailyViews[day]++;
  });

  // Device breakdown
  const devices: Record<string, number> = {};
  views?.forEach(v => {
    const d = v.device_type || "unknown";
    devices[d] = (devices[d] || 0) + 1;
  });

  // UTM sources
  const sources: Record<string, number> = {};
  views?.forEach(v => {
    const s = v.utm_source || v.referrer || "directo";
    sources[s] = (sources[s] || 0) + 1;
  });

  // Identified readers list
  const identifiedReaders = views
    ?.filter(v => v.reader_email)
    .map(v => ({
      email: v.reader_email!,
      name: v.reader_name,
      contactId: v.contact_id,
      isInCrm: !!v.contact_id,
      pagesViewed: v.pages_viewed,
      maxPage: v.max_page_reached,
      totalPages: v.total_pages,
      completionPct: v.total_pages > 0 ? Math.round((v.max_page_reached / v.total_pages) * 100) : 0,
      timeSeconds: v.time_on_book_seconds,
      date: v.started_at,
      completed: v.completed,
    }))
    .sort((a, b) => (a.isInCrm === b.isInCrm ? 0 : a.isInCrm ? -1 : 1)) || [];

  const readersInCrm = identifiedReaders.filter(r => r.isInCrm).length;

  return {
    isLoading: viewsLoading || eventsLoading,
    totalViews,
    readersInCrm,
    uniqueReaders,
    anonymousViews,
    completedViews,
    completionRate,
    avgTimeSeconds,
    pageDropOff,
    dailyViews,
    devices,
    sources,
    identifiedReaders,
    views: views || [],
    pageEvents: pageEvents || [],
  };
}
