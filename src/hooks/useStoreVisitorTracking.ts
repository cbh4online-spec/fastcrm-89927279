import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVisitorScoreTracker } from "@/hooks/useVisitorScore";

const CONSENT_STORAGE_KEY = "gdpr_consent";
const GDPR_VISITOR_ID_KEY = "gdpr_visitor_id";

function getConsentState() {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as { analytics: boolean; marketing: boolean; hasConsented: boolean };
  } catch {}
  return { analytics: false, marketing: false, hasConsented: false };
}

function getGdprVisitorId(): string | null {
  return localStorage.getItem(GDPR_VISITOR_ID_KEY) || null;
}

const SESSION_KEY = "store_view_session_id";
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const CLASSIFY_PRODUCTS_THRESHOLD = 3;
const CLASSIFY_TIME_THRESHOLD = 120; // 2 minutes
const SCROLL_THROTTLE_MS = 1_000;

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function getUTMParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

function getScrollDepthPercent(): number {
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const viewportHeight = window.innerHeight;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  if (docHeight <= viewportHeight) return 100;
  return Math.min(100, Math.round(((scrollTop + viewportHeight) / docHeight) * 100));
}

interface UseStoreVisitorTrackingOptions {
  workspaceId: string | undefined;
  currentPage: string;
  productId?: string;
}

export function useStoreVisitorTracking({ workspaceId, currentPage, productId }: UseStoreVisitorTrackingOptions) {
  const sessionId = useRef(getSessionId());
  const startTime = useRef(Date.now());
  const productsViewed = useRef<Set<string>>(new Set());
  const pagesCount = useRef(0);
  const pagesHistory = useRef<string[]>([]);
  const maxScrollDepth = useRef(0);
  const classifyTriggered = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout>>();
  const { trackEvent, getScore } = useVisitorScoreTracker(workspaceId);

  const upsertSession = useCallback(async (extraFields: Record<string, any> = {}) => {
    if (!workspaceId) return;

    const timeOnSite = Math.floor((Date.now() - startTime.current) / 1000);
    const productsArray = Array.from(productsViewed.current);

    const consent = getConsentState();
    const gdprVisitorId = getGdprVisitorId();

    const sessionData = {
      workspace_id: workspaceId,
      session_id: sessionId.current,
      pages_viewed: pagesCount.current,
      products_viewed: productsArray,
      time_on_site_seconds: timeOnSite,
      last_activity_at: new Date().toISOString(),
      scroll_depth_max: maxScrollDepth.current,
      exit_page: currentPage,
      pages_history: pagesHistory.current,
      consent_analytics: consent.analytics,
      consent_marketing: consent.marketing,
      gdpr_visitor_id: gdprVisitorId,
      ...extraFields,
    };

    const { error } = await supabase
      .from("store_visitor_sessions" as any)
      .upsert(sessionData, { onConflict: "workspace_id,session_id" });

    if (error) {
      console.warn("[ECOMMERCE] VISITOR_SESSION_FAILED", error.message);
    }

    return { timeOnSite, productsCount: productsArray.length };
  }, [workspaceId, currentPage]);

  const triggerClassification = useCallback(async () => {
    if (!workspaceId || classifyTriggered.current) return;
    classifyTriggered.current = true;

    try {
      await supabase.functions.invoke("store-classify-visitor", {
        body: {
          workspace_id: workspaceId,
          session_id: sessionId.current,
        },
      });
    } catch (err) {
      console.warn("[ECOMMERCE] VISITOR_CLASSIFY_FAILED", (err as Error).message);
      classifyTriggered.current = false;
    }
  }, [workspaceId]);

  // Initial session creation + page tracking + score events
  useEffect(() => {
    if (!workspaceId) return;

    pagesCount.current += 1;
    trackEvent("page_view");

    // Add to pages history (deduplicate consecutive)
    const lastPage = pagesHistory.current[pagesHistory.current.length - 1];
    if (lastPage !== currentPage) {
      pagesHistory.current = [...pagesHistory.current, currentPage].slice(-50);
    }

    // Reset scroll depth for new page
    maxScrollDepth.current = getScrollDepthPercent();

    const isFirstPage = pagesCount.current === 1;
    const utmParams = getUTMParams();

    const initFields: Record<string, any> = {};
    if (isFirstPage) {
      initFields.first_page = currentPage;
      initFields.referrer = document.referrer || null;
      initFields.device_type = getDeviceType();
      initFields.started_at = new Date().toISOString();
      if (utmParams.utm_source) initFields.utm_source = utmParams.utm_source;
      if (utmParams.utm_medium) initFields.utm_medium = utmParams.utm_medium;
      if (utmParams.utm_campaign) initFields.utm_campaign = utmParams.utm_campaign;
    }

    upsertSession(initFields);
  }, [workspaceId, currentPage, upsertSession, trackEvent]);

  // Scroll depth tracking + score milestones
  const scrollScoreTracked = useRef({ s75: false, s100: false });
  useEffect(() => {
    if (!workspaceId) return;

    const handleScroll = () => {
      const depth = getScrollDepthPercent();
      if (depth > maxScrollDepth.current) {
        maxScrollDepth.current = depth;
      }
      // Score milestones
      if (depth >= 75 && !scrollScoreTracked.current.s75) {
        scrollScoreTracked.current.s75 = true;
        trackEvent("scroll_75");
      }
      if (depth >= 100 && !scrollScoreTracked.current.s100) {
        scrollScoreTracked.current.s100 = true;
        trackEvent("scroll_100");
      }

      if (scrollThrottleRef.current) return;
      scrollThrottleRef.current = setTimeout(() => {
        scrollThrottleRef.current = undefined;
      }, SCROLL_THROTTLE_MS);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollThrottleRef.current) clearTimeout(scrollThrottleRef.current);
    };
  }, [workspaceId, trackEvent]);

  // Track exit page on beforeunload
  useEffect(() => {
    if (!workspaceId) return;

    const handleBeforeUnload = () => {
      const timeOnSite = Math.floor((Date.now() - startTime.current) / 1000);
      const productsArray = Array.from(productsViewed.current);

      const payload = JSON.stringify({
        workspace_id: workspaceId,
        session_id: sessionId.current,
        pages_viewed: pagesCount.current,
        products_viewed: productsArray,
        time_on_site_seconds: timeOnSite,
        last_activity_at: new Date().toISOString(),
        scroll_depth_max: maxScrollDepth.current,
        exit_page: currentPage,
        pages_history: pagesHistory.current,
      });

      // Use sendBeacon for reliable exit tracking
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/store_visitor_sessions?on_conflict=workspace_id,session_id`;
      navigator.sendBeacon(
        url,
        new Blob([payload], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [workspaceId, currentPage]);

  // Track product views + score
  useEffect(() => {
    if (!productId || !workspaceId) return;
    if (productsViewed.current.has(productId)) return;

    productsViewed.current.add(productId);
    trackEvent("product_view");
    upsertSession().then((result) => {
      if (!result) return;
      if (
        result.productsCount >= CLASSIFY_PRODUCTS_THRESHOLD ||
        result.timeOnSite >= CLASSIFY_TIME_THRESHOLD
      ) {
        triggerClassification();
      }
    });
  }, [productId, workspaceId, upsertSession, triggerClassification, trackEvent]);

  // Heartbeat (includes scroll depth + exit page automatically via upsertSession)
  useEffect(() => {
    if (!workspaceId) return;

    heartbeatRef.current = setInterval(async () => {
      const result = await upsertSession();
      if (!result) return;

      if (result.timeOnSite >= CLASSIFY_TIME_THRESHOLD) {
        triggerClassification();
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [workspaceId, upsertSession, triggerClassification]);
}
