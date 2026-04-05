/**
 * Store Tracking Event Helper
 * 
 * Fires events to `store_tracking_events` table, respecting GDPR consent.
 * Can be called from any store component or hook.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "store_view_session_id";
const CONSENT_STORAGE_KEY = "gdpr_consent";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  hasConsented: boolean;
}

function getConsent(): ConsentState {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { necessary: true, analytics: false, marketing: false, hasConsented: false };
}

function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Track a store interaction event.
 * Only fires if analytics consent is granted (or consent hasn't been asked yet — necessary cookies).
 */
export function trackStoreEvent(
  workspaceId: string,
  eventType: string,
  eventData: Record<string, unknown> = {},
) {
  const consent = getConsent();
  // Allow tracking if analytics consent granted, or if user hasn't been asked yet (necessary-only mode)
  if (consent.hasConsented && !consent.analytics) return;

  const sessionId = getSessionId();
  if (!sessionId || !workspaceId) return;

  // Sanitize event data — remove PII fields
  const BLOCKED = new Set(["email", "phone", "name", "address", "password", "token", "secret"]);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(eventData)) {
    if (!BLOCKED.has(k.toLowerCase()) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)) {
      clean[k] = v;
    }
  }

  (supabase as any)
    .from("store_tracking_events")
    .insert({
      workspace_id: workspaceId,
      session_id: sessionId,
      event_type: eventType,
      event_data: clean,
      page_url: window.location.pathname,
    })
    .then(({ error }: any) => {
      if (error) console.warn("[ECOMMERCE] TRACK_EVENT_FAILED", error.message);
    });
}
