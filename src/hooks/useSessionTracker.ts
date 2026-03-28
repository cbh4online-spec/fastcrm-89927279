import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const IDLE_THRESHOLD_MS = 30 * 1000; // 30s no activity = idle

export function useSessionTracker() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const lastActivityRef = useRef(Date.now());
  const activeSecondsRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const pageViewsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user?.id || !currentWorkspace?.id) return;

    const markActive = () => { lastActivityRef.current = Date.now(); };

    // Track activity events
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    // Count page views on navigation
    const countPageView = () => { pageViewsRef.current += 1; };
    window.addEventListener("popstate", countPageView);
    pageViewsRef.current = 1; // initial

    // Tick every second to accumulate active/idle
    tickRef.current = setInterval(() => {
      const isIdle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS;
      if (isIdle) {
        idleSecondsRef.current += 1;
      } else {
        activeSecondsRef.current += 1;
      }
    }, 1000);

    // Sync to DB every 5 min
    const syncToDB = async () => {
      const active = activeSecondsRef.current;
      const idle = idleSecondsRef.current;
      const pv = pageViewsRef.current;
      if (active === 0 && idle === 0) return;

      const today = new Date().toISOString().split("T")[0];

      try {
        // Try upsert — on conflict increment
        const { data: existing } = await supabase
          .from("session_time_logs")
          .select("id, active_seconds, idle_seconds, total_seconds, page_views")
          .eq("workspace_id", currentWorkspace.id)
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("session_time_logs")
            .update({
              active_seconds: existing.active_seconds + active,
              idle_seconds: existing.idle_seconds + idle,
              total_seconds: existing.total_seconds + active + idle,
              page_views: existing.page_views + pv,
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("session_time_logs").insert({
            workspace_id: currentWorkspace.id,
            user_id: user.id,
            date: today,
            active_seconds: active,
            idle_seconds: idle,
            total_seconds: active + idle,
            page_views: pv,
            last_activity_at: new Date().toISOString(),
          });
        }

        // Reset counters after successful sync
        activeSecondsRef.current = 0;
        idleSecondsRef.current = 0;
        pageViewsRef.current = 0;
      } catch {
        // Silent fail — will retry next interval
      }
    };

    intervalRef.current = setInterval(syncToDB, SYNC_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      window.removeEventListener("popstate", countPageView);
      if (tickRef.current) clearInterval(tickRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Final sync on unmount
      syncToDB();
    };
  }, [user?.id, currentWorkspace?.id]);
}
