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
