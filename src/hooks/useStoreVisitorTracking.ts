import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "store_view_session_id";
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const CLASSIFY_PRODUCTS_THRESHOLD = 3;
const CLASSIFY_TIME_THRESHOLD = 120; // 2 minutes

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
  const classifyTriggered = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  const upsertSession = useCallback(async (extraFields: Record<string, any> = {}) => {
    if (!workspaceId) return;

    const timeOnSite = Math.floor((Date.now() - startTime.current) / 1000);
    const productsArray = Array.from(productsViewed.current);

    const sessionData = {
      workspace_id: workspaceId,
      session_id: sessionId.current,
      pages_viewed: pagesCount.current,
      products_viewed: productsArray,
      time_on_site_seconds: timeOnSite,
      last_activity_at: new Date().toISOString(),
      ...extraFields,
    };

    const { error } = await supabase
      .from("store_visitor_sessions" as any)
      .upsert(sessionData, { onConflict: "workspace_id,session_id" });

    if (error) {
      console.error("[StoreTracking] upsert error:", error.message);
    }

    return { timeOnSite, productsCount: productsArray.length };
  }, [workspaceId]);

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
      console.error("[StoreTracking] classification error:", err);
      classifyTriggered.current = false; // allow retry
    }
  }, [workspaceId]);

  // Initial session creation
  useEffect(() => {
    if (!workspaceId) return;

    pagesCount.current += 1;

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
  }, [workspaceId, currentPage, upsertSession]);

  // Track product views
  useEffect(() => {
    if (!productId || !workspaceId) return;
    if (productsViewed.current.has(productId)) return;

    productsViewed.current.add(productId);
    upsertSession().then((result) => {
      if (!result) return;
      // Check classification thresholds
      if (
        result.productsCount >= CLASSIFY_PRODUCTS_THRESHOLD ||
        result.timeOnSite >= CLASSIFY_TIME_THRESHOLD
      ) {
        triggerClassification();
      }
    });
  }, [productId, workspaceId, upsertSession, triggerClassification]);

  // Heartbeat
  useEffect(() => {
    if (!workspaceId) return;

    heartbeatRef.current = setInterval(async () => {
      const result = await upsertSession();
      if (!result) return;

      // Check time-based classification threshold
      if (result.timeOnSite >= CLASSIFY_TIME_THRESHOLD) {
        triggerClassification();
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [workspaceId, upsertSession, triggerClassification]);
}
