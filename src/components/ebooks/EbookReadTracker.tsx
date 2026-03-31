import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";

interface EbookReadTrackerProps {
  ebookId: string;
  workspaceId: string;
  viewId: string;
  currentPage: number;
  totalPages: number;
}

export function EbookReadTracker({ ebookId, workspaceId, viewId, currentPage, totalPages }: EbookReadTrackerProps) {
  const lastPageRef = useRef(currentPage);
  const pageTimerRef = useRef<number>(Date.now());
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(Date.now());
  const pagesViewedSet = useRef<Set<number>>(new Set([0]));
  const maxPageRef = useRef(0);

  // Track page change
  useEffect(() => {
    if (currentPage === lastPageRef.current) return;

    const duration = Math.round((Date.now() - pageTimerRef.current) / 1000);

    // Log previous page duration
    if (duration > 0 && duration < 3600) {
      (supabase as any).from("ebook_page_events").insert({
        ebook_view_id: viewId,
        ebook_id: ebookId,
        workspace_id: workspaceId,
        page_number: lastPageRef.current,
        event_type: "page_view",
        duration_seconds: duration,
      }).then(() => {});
    }

    pagesViewedSet.current.add(currentPage);
    if (currentPage > maxPageRef.current) maxPageRef.current = currentPage;
    lastPageRef.current = currentPage;
    pageTimerRef.current = Date.now();
  }, [currentPage, ebookId, workspaceId, viewId]);

  // Heartbeat every 30s
  const completedEmittedRef = useRef(false);
  const sendHeartbeat = useCallback(() => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    const completed = maxPageRef.current >= totalPages - 1;

    (supabase as any).from("ebook_views").update({
      pages_viewed: pagesViewedSet.current.size,
      max_page_reached: maxPageRef.current,
      time_on_book_seconds: elapsed,
      completed,
      last_activity_at: new Date().toISOString(),
    }).eq("id", viewId).then(() => {});

    // Emit kernel event when read completed (once)
    if (completed && !completedEmittedRef.current) {
      completedEmittedRef.current = true;
      emitKernelEvent({
        workspace_id: workspaceId,
        type: "ebook.read_completed",
        entity_kind: "ebook_view",
        entity_id: viewId,
        source_module: "ebooks",
        payload: {
          ebook_id: ebookId,
          pages_viewed: pagesViewedSet.current.size,
          time_on_book_seconds: elapsed,
        },
      });
    }
  }, [viewId, totalPages, workspaceId, ebookId]);

  useEffect(() => {
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      sendHeartbeat(); // final flush
    };
  }, [sendHeartbeat]);

  // Cleanup on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const completed = maxPageRef.current >= totalPages - 1;
      const body = JSON.stringify({
        pages_viewed: pagesViewedSet.current.size,
        max_page_reached: maxPageRef.current,
        time_on_book_seconds: elapsed,
        completed,
        last_activity_at: new Date().toISOString(),
      });

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ebook_views?id=eq.${viewId}`;
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [viewId, totalPages]);

  return null;
}
