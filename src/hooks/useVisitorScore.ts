import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScoreEvent {
  type: string;
  value?: number;
}

const SCORE_WEIGHTS: Record<string, number> = {
  page_view: 5,
  scroll_75: 10,
  scroll_100: 15,
  cta_click: 15,
  form_started: 20,
  form_submit: 30,
  time_60s: 5,
  time_180s: 10,
  product_view: 5,
  add_to_cart: 20,
};

export type VisitorTemperature = "cold" | "warm" | "hot";

export function getTemperature(score: number): VisitorTemperature {
  if (score >= 50) return "hot";
  if (score >= 20) return "warm";
  return "cold";
}

export function getTemperatureLabel(temp: VisitorTemperature): string {
  switch (temp) {
    case "hot": return "🔥 Quente";
    case "warm": return "🌡️ Morno";
    case "cold": return "❄️ Frio";
  }
}

export function getTemperatureColor(temp: VisitorTemperature): string {
  switch (temp) {
    case "hot": return "text-red-400";
    case "warm": return "text-amber-400";
    case "cold": return "text-blue-400";
  }
}

export function computeVisitorScore(events: ScoreEvent[]): number {
  let score = 0;
  const seen = new Set<string>();
  for (const e of events) {
    const weight = SCORE_WEIGHTS[e.type] || 0;
    // Some events only score once (form_started, form_submit)
    if (["form_started", "form_submit", "scroll_75", "scroll_100"].includes(e.type)) {
      if (seen.has(e.type)) continue;
      seen.add(e.type);
    }
    score += weight;
  }
  return Math.min(100, score);
}

export function useVisitorScoreTracker(workspaceId?: string) {
  const scoreRef = useRef(0);
  const eventsRef = useRef<ScoreEvent[]>([]);
  const sessionId = useRef(localStorage.getItem("vertical_landing_session_id") || "");

  const trackEvent = useCallback((type: string) => {
    eventsRef.current.push({ type });
    const newScore = computeVisitorScore(eventsRef.current);
    if (newScore !== scoreRef.current) {
      scoreRef.current = newScore;
      // Update score in DB (best-effort, fire and forget)
      if (workspaceId && sessionId.current) {
        (supabase as any)
          .from("store_visitor_sessions")
          .update({ visitor_score: newScore })
          .eq("workspace_id", workspaceId)
          .eq("session_id", sessionId.current)
          .then(() => {});
      }
    }
    return newScore;
  }, [workspaceId]);

  return { trackEvent, getScore: () => scoreRef.current };
}
