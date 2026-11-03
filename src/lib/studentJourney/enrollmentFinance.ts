/**
 * Regras puras da Jornada do Aluno: valores financeiros de uma inscrição
 * (contratado / pago / faturado / vencido / em aberto, sempre separados)
 * e deteção de inscrição duplicada na mesma edição.
 */
export interface InstallmentLike {
  amount: number;
  paid_amount: number;
  due_date: string; // YYYY-MM-DD
}

export interface InvoiceLinkLike {
  invoice_id: string;
  allocated_amount: number | null;
  invoice_total: number;
  invoice_status?: string | null; // 'cancelled' / 'void' / 'draft' não contam
}

export interface EnrollmentFinance {
  contracted: number;
  paid: number;
  invoiced: number;
  overdue: number;
  open: number;
}

const round = (n: number) => Math.round(n * 100) / 100;
const INVALID_INVOICE = new Set(["cancelled", "void", "draft", "anulada", "proforma"]);

export function agreedAmount(base: number | null, discount: number, agreed: number | null): number {
  if (agreed != null) return round(agreed);
  return round(Math.max(0, (base ?? 0) - (discount ?? 0)));
}

export function computeEnrollmentFinance(
  contracted: number,
  installments: InstallmentLike[],
  invoices: InvoiceLinkLike[],
  today: string,
): EnrollmentFinance {
  const paid = installments.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const overdue = installments.reduce(
    (s, i) => (i.due_date < today ? s + Math.max(0, i.amount - (i.paid_amount || 0)) : s),
    0,
  );
  // Cada fatura conta uma só vez, mesmo que ligada repetidamente.
  const seen = new Set<string>();
  let invoiced = 0;
  for (const inv of invoices) {
    if (seen.has(inv.invoice_id)) continue;
    if (inv.invoice_status && INVALID_INVOICE.has(inv.invoice_status)) continue;
    seen.add(inv.invoice_id);
    invoiced += inv.allocated_amount ?? inv.invoice_total;
  }
  return {
    contracted: round(contracted),
    paid: round(paid),
    invoiced: round(invoiced),
    overdue: round(overdue),
    open: round(Math.max(0, contracted - paid)),
  };
}

export interface EnrollmentKey {
  profile_id: string;
  cohort_id: string | null;
  admin_status?: string | null;
}

/** Duplicado = mesmo aluno já inscrito (não cancelado) na mesma edição. */
export function isDuplicateEnrollment(existing: EnrollmentKey[], candidate: EnrollmentKey): boolean {
  if (!candidate.cohort_id) return false;
  return existing.some(
    (e) =>
      e.profile_id === candidate.profile_id &&
      e.cohort_id === candidate.cohort_id &&
      e.admin_status !== "cancelled",
  );
}

// ---------- Fase D: plano de pagamento e estado financeiro ----------
export type FinancialStatus = "sem_plano" | "em_dia" | "parcial" | "em_atraso" | "liquidado";
export const FINANCIAL_STATUS_LABEL: Record<FinancialStatus, string> = {
  sem_plano: "Sem plano", em_dia: "Em dia", parcial: "Parcial", em_atraso: "Em atraso", liquidado: "Liquidado",
};
export type PlanFrequency = "mensal" | "quinzenal" | "semanal";

function addToYmd(ymd: string, freq: PlanFrequency, steps: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (freq === "mensal") {
    const target = new Date(Date.UTC(y, m - 1 + steps, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, last));
    return target.toISOString().slice(0, 10);
  }
  const days = (freq === "quinzenal" ? 14 : 7) * steps;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Divide o valor em N prestações (cêntimos exatos; a diferença fica na última). */
export function buildInstallmentPlan(total: number, count: number, firstDue: string, freq: PlanFrequency = "mensal") {
  const n = Math.max(1, Math.floor(count));
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => ({
    amount: (i === n - 1 ? cents - base * (n - 1) : base) / 100,
    due_date: addToYmd(firstDue, freq, i),
  }));
}

export function planMatchesAgreed(plan: { amount: number }[], agreed: number): boolean {
  return Math.round(plan.reduce((s, p) => s + p.amount, 0) * 100) === Math.round(agreed * 100);
}

/** Aplica o total recebido às prestações por ordem de vencimento (espelha sj_reallocate_payments). */
export function allocatePayment<T extends { amount: number; due_date: string }>(installments: T[], totalPaid: number) {
  let left = Math.round(totalPaid * 100);
  return [...installments]
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((i) => {
      const take = Math.min(Math.round(i.amount * 100), left);
      left -= take;
      return { ...i, paid_amount: take / 100 };
    });
}

/** Estado derivado das prestações, nunca do estado da inscrição (espelha sj_recompute_financial_status). */
export function deriveFinancialStatus(installments: InstallmentLike[], today: string): FinancialStatus {
  if (!installments.length) return "sem_plano";
  const total = installments.reduce((s, i) => s + i.amount, 0);
  const paid = installments.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const overdue = installments.some((i) => i.due_date < today && i.amount - (i.paid_amount || 0) > 0.004);
  if (paid >= total - 0.004) return "liquidado";
  if (overdue) return "em_atraso";
  return paid > 0 ? "parcial" : "em_dia";
}
