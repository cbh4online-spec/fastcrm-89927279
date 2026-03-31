import { useCallback, useEffect, useRef } from "react";
import { supabase as _supabase } from "@/integrations/supabase/client";

const supabase = _supabase as any;

function getSessionId(): string {
  const key = "funnel_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getUTMs() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

interface TrackingContext {
  workspace_id: string;
  funnel_id: string;
}

export function useFunnelTracking(ctx: TrackingContext | null) {
  const trackedViews = useRef(new Set<string>());
  const contactIdRef = useRef<string | null>(null);
  const sessionId = useRef(getSessionId());

  const trackEvent = useCallback(
    async (
      event_type: string,
      step_id?: string,
      extra?: { event_value?: string; metadata?: Record<string, unknown> }
    ) => {
      if (!ctx) return;
      const utms = getUTMs();
      await supabase.from("funnel_events").insert({
        workspace_id: ctx.workspace_id,
        funnel_id: ctx.funnel_id,
        step_id: step_id || null,
        contact_id: contactIdRef.current || null,
        session_id: sessionId.current,
        event_type,
        event_value: extra?.event_value || null,
        device_type: getDeviceType(),
        referrer: document.referrer || null,
        utm_source: utms.utm_source || null,
        utm_medium: utms.utm_medium || null,
        utm_campaign: utms.utm_campaign || null,
        metadata: extra?.metadata || {},
      });
    },
    [ctx]
  );

  const trackStepView = useCallback(
    (stepId: string) => {
      if (trackedViews.current.has(stepId)) return;
      trackedViews.current.add(stepId);
      trackEvent("step_view", stepId);
    },
    [trackEvent]
  );

  const trackFormStarted = useCallback(
    (stepId: string) => trackEvent("form_started", stepId),
    [trackEvent]
  );

  const trackFormSuccess = useCallback(
    (stepId: string) => trackEvent("form_submit_success", stepId),
    [trackEvent]
  );

  const trackFormFailed = useCallback(
    (stepId: string, error?: string) =>
      trackEvent("form_submit_failed", stepId, { event_value: error }),
    [trackEvent]
  );

  const trackCtaClicked = useCallback(
    (stepId: string, ctaLabel?: string) =>
      trackEvent("cta_clicked", stepId, { event_value: ctaLabel }),
    [trackEvent]
  );

  const trackStepCompleted = useCallback(
    (stepId: string) => trackEvent("step_completed", stepId),
    [trackEvent]
  );

  const trackFunnelCompleted = useCallback(
    () => trackEvent("funnel_completed"),
    [trackEvent]
  );

  const setContactId = useCallback((id: string) => {
    contactIdRef.current = id;
  }, []);

  // step_abandoned via beforeunload
  const currentStepRef = useRef<string | null>(null);
  const completedStepsRef = useRef(new Set<string>());

  const setCurrentStep = useCallback((stepId: string) => {
    currentStepRef.current = stepId;
  }, []);

  const markStepCompleted = useCallback((stepId: string) => {
    completedStepsRef.current.add(stepId);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = currentStepRef.current;
      if (sid && !completedStepsRef.current.has(sid) && ctx) {
        const utms = getUTMs();
        const body = JSON.stringify({
          workspace_id: ctx.workspace_id,
          funnel_id: ctx.funnel_id,
          step_id: sid,
          contact_id: contactIdRef.current || null,
          session_id: sessionId.current,
          event_type: "step_abandoned",
          event_value: null,
          device_type: getDeviceType(),
          referrer: document.referrer || null,
          utm_source: utms.utm_source || null,
          utm_medium: utms.utm_medium || null,
          utm_campaign: utms.utm_campaign || null,
          metadata: {},
        });
        // Use sendBeacon for reliability on unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/funnel_events`;
        const headers = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: "return=minimal",
        };
        const blob = new Blob([body], { type: "application/json" });
        // sendBeacon doesn't support custom headers, use fetch keepalive
        try {
          fetch(url, { method: "POST", headers, body: blob, keepalive: true });
        } catch {
          // best effort
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [ctx]);

  return {
    trackStepView,
    trackFormStarted,
    trackFormSuccess,
    trackFormFailed,
    trackCtaClicked,
    trackStepCompleted,
    trackFunnelCompleted,
    setContactId,
    setCurrentStep,
    markStepCompleted,
    sessionId: sessionId.current,
  };
}
