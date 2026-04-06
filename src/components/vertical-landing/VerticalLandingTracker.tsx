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

  // Section scroll tracking with time measurement + click tracking
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
            sectionEntryTimes.current.set(sectionId, Date.now());

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
                .then(() => {});
            }
          } else {
            const entryTime = sectionEntryTimes.current.get(sectionId);
            if (entryTime) {
              const duration = Math.round(Date.now() - entryTime);
              if (duration > 500) {
                (supabase as any)
                  .from("vertical_landing_events")
                  .insert({
                    template_slug: slug,
                    template_id: templateId || null,
                    workspace_id: workspaceId || null,
                    event_type: "section_exit",
                    session_id: sessionId,
                    page_section: sectionId,
                    device_type: getDeviceType(),
                    time_on_section_ms: duration,
                  })
                  .then(() => {});
              }
              sectionEntryTimes.current.delete(sectionId);
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    // Click tracking — normalized coordinates
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const tag = target.tagName?.toLowerCase() || "";
      const isInteractive = ["a", "button", "input", "select", "textarea"].includes(tag) ||
        target.closest("a, button, [role=button]");
      if (!isInteractive) return;

      const xPct = Math.round((e.clientX / window.innerWidth) * 100);
      const yPct = Math.round(((e.clientY + window.scrollY) / document.body.scrollHeight) * 100);
      const elLabel = target.textContent?.trim().substring(0, 50) ||
        target.getAttribute("aria-label") ||
        `${tag}${target.className ? '.' + target.className.split(' ')[0] : ''}`;

      (supabase as any)
        .from("vertical_landing_events")
        .insert({
          template_slug: slug,
          template_id: templateId || null,
          workspace_id: workspaceId || null,
          event_type: "element_click",
          session_id: sessionId,
          device_type: getDeviceType(),
          click_x_pct: xPct,
          click_y_pct: yPct,
          click_element: elLabel,
        })
        .then(() => {});
    };

    document.addEventListener("click", clickHandler, { passive: true });

    // Observe sections after a delay
    const timer = setTimeout(() => {
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
      document.removeEventListener("click", clickHandler);
    };
  }, [slug, templateId, workspaceId]);

  return null;
}

/** Track form field events */
export function trackVerticalFieldEvent(
  slug: string, eventType: "field_focus" | "field_blur" | "form_abandon",
  fieldName: string, fieldOrder: number, timeMs?: number,
  templateId?: string, workspaceId?: string
) {
  const sessionId = localStorage.getItem(SESSION_KEY) || crypto.randomUUID();
  (supabase as any)
    .from("vertical_landing_events")
    .insert({
      template_slug: slug,
      template_id: templateId || null,
      workspace_id: workspaceId || null,
      event_type: eventType,
      session_id: sessionId,
      device_type: getDeviceType(),
      field_name: fieldName,
      field_order: fieldOrder,
      time_on_section_ms: timeMs || null,
    })
    .then(() => {});
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
