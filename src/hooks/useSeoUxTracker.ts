import { useEffect, useRef, useCallback } from "react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "xqepxufdrsuxlnubuatz";
const TRACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/seo-track`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface TrackEvent {
  event_type: string;
  event_data?: Record<string, unknown>;
  workspace_id?: string;
  entity_id?: string;
  page_url?: string;
  page_type?: string;
}

function getVisitorId(): string {
  let id = localStorage.getItem("_seo_vid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("_seo_vid", id);
  }
  return id;
}

function getSessionId(): string {
  let id = sessionStorage.getItem("_seo_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("_seo_sid", id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

// Batching: collect events and flush every 3s or when 10 events collected
let eventBuffer: Record<string, unknown>[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = [...eventBuffer];
  eventBuffer = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  // Fire and forget - use sendBeacon for reliability
  const blob = new Blob([JSON.stringify(batch)], { type: "application/json" });
  const sent = navigator.sendBeacon?.(
    `${TRACK_URL}?apikey=${ANON_KEY}`,
    blob
  );

  if (!sent) {
    // Fallback to fetch
    fetch(TRACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
      body: JSON.stringify(batch),
      keepalive: true,
    }).catch(() => {});
  }
}

function queueEvent(event: Record<string, unknown>) {
  eventBuffer.push(event);
  if (eventBuffer.length >= 10) {
    flushEvents();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, 3000);
  }
}

/**
 * UX tracker hook for public-facing pages.
 * Captures: page_view, scroll_depth, cta_click, rage_click, dead_click, error_shown
 */
export function useSeoUxTracker(options: {
  workspaceId?: string;
  entityId?: string;
  pageType?: string;
  enabled?: boolean;
}) {
  const { workspaceId, entityId, pageType, enabled = true } = options;
  const rageClickMap = useRef(new Map<string, { count: number; lastTime: number }>());
  const scrollMilestones = useRef(new Set<number>());
  const maxScroll = useRef(0);

  const basePayload = useCallback(() => ({
    workspace_id: workspaceId,
    entity_id: entityId,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    page_url: window.location.pathname,
    page_type: pageType,
    device_type: getDeviceType(),
    referrer: document.referrer || undefined,
    ...getUtmParams(),
  }), [workspaceId, entityId, pageType]);

  const trackEvent = useCallback((event: TrackEvent) => {
    if (!enabled) return;
    queueEvent({
      ...basePayload(),
      ...event,
    });
  }, [enabled, basePayload]);

  // Page view
  useEffect(() => {
    if (!enabled) return;
    trackEvent({ event_type: "page_view" });
  }, [enabled, trackEvent]);

  // Scroll depth tracking
  useEffect(() => {
    if (!enabled) return;
    const milestones = [25, 50, 75, 100];

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);
      maxScroll.current = Math.max(maxScroll.current, pct);

      for (const m of milestones) {
        if (pct >= m && !scrollMilestones.current.has(m)) {
          scrollMilestones.current.add(m);
          trackEvent({
            event_type: "scroll_depth",
            event_data: { depth: m },
          });
        }
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [enabled, trackEvent]);

  // Rage click detection (3+ clicks in same area within 1s)
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      const key = `${Math.round(e.clientX / 50)}-${Math.round(e.clientY / 50)}`;
      const now = Date.now();
      const entry = rageClickMap.current.get(key);

      if (entry && now - entry.lastTime < 1000) {
        entry.count++;
        entry.lastTime = now;
        if (entry.count === 3) {
          const target = e.target as HTMLElement;
          trackEvent({
            event_type: "rage_click",
            event_data: {
              x: e.clientX,
              y: e.clientY,
              target_tag: target.tagName,
              target_text: target.textContent?.slice(0, 50),
            },
          });
        }
      } else {
        rageClickMap.current.set(key, { count: 1, lastTime: now });
      }

      // Dead click: click on non-interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.closest("a, button, input, select, textarea, [role='button'], [onclick]");
      if (!isInteractive && target.textContent?.trim()) {
        trackEvent({
          event_type: "dead_click",
          event_data: {
            target_tag: target.tagName,
            target_text: target.textContent?.slice(0, 50),
          },
        });
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [enabled, trackEvent]);

  // Error tracking
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: ErrorEvent) => {
      trackEvent({
        event_type: "error_shown",
        event_data: {
          message: e.message?.slice(0, 200),
          filename: e.filename,
          lineno: e.lineno,
        },
      });
    };

    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, [enabled, trackEvent]);

  // Flush on page unload
  useEffect(() => {
    if (!enabled) return;

    const handler = () => {
      // Track scroll abandon if didn't reach 75%
      if (maxScroll.current < 75 && maxScroll.current > 0) {
        queueEvent({
          ...basePayload(),
          event_type: "scroll_abandon",
          event_data: { max_depth: maxScroll.current },
        });
      }
      flushEvents();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, basePayload]);

  // Manual CTA click tracker
  const trackCtaClick = useCallback((placement: string, ctaText?: string) => {
    trackEvent({
      event_type: "cta_click",
      event_data: { placement, cta_text: ctaText },
    });
  }, [trackEvent]);

  // Manual empty state tracker
  const trackEmptyState = useCallback((section: string) => {
    trackEvent({
      event_type: "empty_state",
      event_data: { section },
    });
  }, [trackEvent]);

  return { trackEvent, trackCtaClick, trackEmptyState };
}
