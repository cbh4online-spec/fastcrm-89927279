import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceType } from "@/lib/analyticsHelpers";

const SESSION_KEY = "vertical_landing_session_id";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

interface Props {
  slug: string;
  templateId?: string;
  workspaceId?: string;
}

export function VerticalLandingTracker({ slug, templateId, workspaceId }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || !slug) return;
    tracked.current = true;

    const sessionId = getSessionId();
    const viewKey = `vl_view_${sessionId}_${slug}`;

    // Debounce: only track once per session per slug
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

    (supabase as any)
      .from("vertical_landing_events")
      .insert({
        template_slug: slug,
        template_id: templateId || null,
        workspace_id: workspaceId || null,
        event_type: "view",
        session_id: sessionId,
        referrer: document.referrer || null,
        device_type: getDeviceType(),
      })
      .then(() => {});
  }, [slug, templateId, workspaceId]);

  return null;
}

/** Call this after a successful form submission */
export function trackVerticalFormSubmit(slug: string, templateId?: string, workspaceId?: string) {
  const sessionId = localStorage.getItem(SESSION_KEY) || crypto.randomUUID();

  (supabase as any)
    .from("vertical_landing_events")
    .insert({
      template_slug: slug,
      template_id: templateId || null,
      workspace_id: workspaceId || null,
      event_type: "form_submit",
      session_id: sessionId,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
    })
    .then(() => {});
}
