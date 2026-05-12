/**
 * LeadChef — utilidades para cálculo de progresso vs objetivos.
 */

export type GoalStatus = "empty" | "low" | "medium" | "good" | "done";

export function calculateGoalProgress(current: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  if (current <= 0) return 0;
  const pct = (current / goal) * 100;
  return Math.max(0, Math.round(pct));
}

export function calculateGoalProgressCapped(current: number, goal: number): number {
  return Math.min(100, calculateGoalProgress(current, goal));
}

export function formatGoalLabel(current: number, goal: number): string {
  if (!goal || goal <= 0) return `${current}`;
  return `${current} / ${goal}`;
}

export function getGoalStatus(current: number, goal: number): GoalStatus {
  if (!goal || goal <= 0) return "empty";
  const pct = calculateGoalProgress(current, goal);
  if (pct >= 100) return "done";
  if (pct >= 75) return "good";
  if (pct >= 40) return "medium";
  if (pct > 0) return "low";
  return "empty";
}

export function getGoalStatusColor(status: GoalStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500";
    case "good":
      return "bg-emerald-400";
    case "medium":
      return "bg-amber-400";
    case "low":
      return "bg-rose-400";
    case "empty":
    default:
      return "bg-slate-300";
  }
}

export function getGoalStatusTone(status: GoalStatus): {
  bg: string;
  text: string;
  border: string;
  ring: string;
} {
  switch (status) {
    case "done":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        ring: "stroke-emerald-500",
      };
    case "good":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        ring: "stroke-emerald-400",
      };
    case "medium":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        ring: "stroke-amber-400",
      };
    case "low":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        ring: "stroke-rose-400",
      };
    case "empty":
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        ring: "stroke-slate-300",
      };
  }
}

function formatYmd(y: number, m: number): string {
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

export function startOfMonthIso(date: Date = new Date()): string {
  return formatYmd(date.getFullYear(), date.getMonth() + 1);
}

export function shiftMonth(periodMonth: string, delta: number): string {
  const [y, m] = periodMonth.split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return formatYmd(d.getFullYear(), d.getMonth() + 1);
}

export function formatMonthPt(periodMonth: string): string {
  const [y, m] = periodMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthRange(periodMonth: string): { start: Date; end: Date } {
  const [y, m] = periodMonth.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  return { start, end };
}

export function isSameMonth(periodMonth: string, date: Date = new Date()): boolean {
  return periodMonth === startOfMonthIso(date);
}
