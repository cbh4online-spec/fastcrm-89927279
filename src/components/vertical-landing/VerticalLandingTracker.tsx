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

function getUtmParams(): Record<string, string | null> {
  const url = new URL(window.location.href);
  return {
    utm_source: url.searchParams.get("utm_source"),
    utm_medium: url.searchParams.get("utm_medium"),
    utm_campaign: url.searchParams.get("utm_campaign"),
    utm_term: url.searchParams.get("utm_term"),
    utm_content: url.searchParams.get("utm_content"),
  };
}

interface Props {
  slug: string;
  templateId?: string;
  workspaceId?: string;
}

export function VerticalLandingTracker({ slug, templateId, workspaceId }: Props) {
  const tracked = useRef(false);
  const sectionsTracked = useRef(new Set<string>());

  useEffect(() => {
    if (tracked.current || !slug) return;
    tracked.current = true;

    const sessionId = getSessionId();
    const viewKey = `vl_view_${sessionId}_${slug}`;

    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

    const utm = getUtmParams();

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
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term,
        utm_content: utm.utm_content,
        user_agent: navigator.userAgent?.substring(0, 500) || null,
      })
      .then(() => {});
  }, [slug, templateId, workspaceId]);

  // Section scroll tracking
  useEffect(() => {
    if (!slug) return;
    const sessionId = getSessionId();

    const sections = [
      "hero", "problems", "solution", "transformation",
      "testimonials", "video", "authority", "roi", "cta-form"
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section");
            if (sectionId && !sectionsTracked.current.has(sectionId)) {
              sectionsTracked.current.add(sectionId);
              (supabase as any)
                .from("vertical_landing_events")
                .insert({
                  template_slug: slug,
                  template_id: templateId || null,
                  workspace_id: workspaceId || null,
                  event_type: "section_view",
                  session_id: sessionId,
                  page_section: sectionId,
                  device_type: getDeviceType(),
                })
                .then(() => {});
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    // Observe sections after a delay to let the page render
    const timer = setTimeout(() => {
      for (const sec of sections) {
        const el = document.querySelector(`[data-section="${sec}"]`);
        if (el) observer.observe(el);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [slug, templateId, workspaceId]);

  return null;
}

/** Call this after a successful form submission */
export function trackVerticalFormSubmit(slug: string, templateId?: string, workspaceId?: string) {
  const sessionId = localStorage.getItem(SESSION_KEY) || crypto.randomUUID();
  const utm = getUtmParams();

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
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_term: utm.utm_term,
      utm_content: utm.utm_content,
    })
    .then(() => {});
}
