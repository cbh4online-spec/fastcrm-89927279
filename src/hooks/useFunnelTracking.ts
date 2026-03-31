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

  return {
    trackStepView,
    trackFormStarted,
    trackFormSuccess,
    trackFormFailed,
    trackCtaClicked,
    trackStepCompleted,
    trackFunnelCompleted,
    setContactId,
    sessionId: sessionId.current,
  };
}
