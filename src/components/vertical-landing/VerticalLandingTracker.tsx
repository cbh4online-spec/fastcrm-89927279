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
  const sectionEntryTimes = useRef<Map<string, number>>(new Map());
  const sectionEventIds = useRef<Map<string, string>>(new Map());

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

  // Section scroll tracking with time measurement
  useEffect(() => {
    if (!slug) return;
    const sessionId = getSessionId();

    const defaultSections = [
      "hero", "problems", "solution", "transformation",
      "testimonials", "video", "authority", "roi", "cta-form"
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sectionId = entry.target.getAttribute("data-section");
          if (!sectionId) continue;

          if (entry.isIntersecting) {
            // Track entry time
            sectionEntryTimes.current.set(sectionId, Date.now());

            // Insert section_view event if not yet tracked
            if (!sectionsTracked.current.has(sectionId)) {
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
                .select("id")
                .single()
                .then(({ data }: any) => {
                  if (data?.id) {
                    sectionEventIds.current.set(sectionId, data.id);
                  }
                });
            }
          } else {
            // Section left viewport — update time_on_section_ms
            const entryTime = sectionEntryTimes.current.get(sectionId);
            const eventId = sectionEventIds.current.get(sectionId);
            if (entryTime && eventId) {
              const duration = Math.round(Date.now() - entryTime);
              if (duration > 500) {
                (supabase as any)
                  .from("vertical_landing_events")
                  .update({ time_on_section_ms: duration })
                  .eq("id", eventId)
                  .then(() => {});
              }
              sectionEntryTimes.current.delete(sectionId);
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    // Observe sections after a delay to let the page render
    const timer = setTimeout(() => {
      // Observe default sections + any custom data-section elements
      const allSectionEls = document.querySelectorAll("[data-section]");
      if (allSectionEls.length > 0) {
        allSectionEls.forEach(el => observer.observe(el));
      } else {
        for (const sec of defaultSections) {
          const el = document.querySelector(`[data-section="${sec}"]`);
          if (el) observer.observe(el);
        }
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
