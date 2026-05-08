/**
 * Helpers para scoring LeadChef no frontend.
 */

export interface LeadScoreData {
  score: number;
  breakdown: {
    stage?: number;
    freshness?: number;
    nextAction?: number;
    temperature?: number;
    origin?: number;
  };
  is_cold: boolean;
  calculated_at: string;
}

export function getScoreLabel(score: number): { label: string; tone: "hot" | "warm" | "cold" } {
  if (score >= 65) return { label: "Quente", tone: "hot" };
  if (score >= 35) return { label: "Morno", tone: "warm" };
  return { label: "Frio", tone: "cold" };
}

export function getScoreColorClass(score: number): string {
  if (score >= 65) return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
  if (score >= 35) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30";
}
