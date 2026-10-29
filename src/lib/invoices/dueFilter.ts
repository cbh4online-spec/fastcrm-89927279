import { calendarDaysFromToday } from "@/lib/dates/lisbonDays";

export type DueFilter = "paid" | "not_due" | "overdue";
export const DUE_FILTERS: DueFilter[] = ["paid", "not_due", "overdue"];
export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  paid: "Recebido",
  not_due: "Não vencido",
  overdue: "Vencido",
};

type Inv = { total?: number | null; amount_paid?: number | null; due_date?: string | null; document_type?: string | null };

const isReceivable = (t?: string | null) => !t || t === "invoice" || t === "debit_note";

/** Mesma regra do gráfico «Envelhecimento da dívida». */
export function matchesDueFilter(inv: Inv, filter: DueFilter, now: Date = new Date()): boolean {
  if (!isReceivable(inv.document_type)) return false;
  const paid = Number(inv.amount_paid || 0);
  if (filter === "paid") return paid > 0.005;
  const remaining = Number(inv.total || 0) - paid;
  if (remaining <= 0.005) return false;
  const overdue = inv.due_date ? calendarDaysFromToday(inv.due_date, now) < 0 : false;
  return filter === "overdue" ? overdue : !overdue;
}
