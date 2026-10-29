export interface RelatedInvoiceRow {
  company_id: string | null;
  total: number | null;
  amount_paid: number | null;
  status: string | null;
  document_type: string | null;
  due_date: string | null;
}

export interface RelatedDebtEntry {
  companyId: string;
  outstanding: number;
  overdue: number;
}

/** Soma dívida em aberto (só faturas e notas de débito) por empresa relacionada. */
export function computeRelatedDebt(rows: RelatedInvoiceRow[], todayIso: string): RelatedDebtEntry[] {
  const map = new Map<string, RelatedDebtEntry>();
  for (const r of rows) {
    if (!r.company_id) continue;
    const dt = r.document_type;
    if (dt && dt !== "invoice" && dt !== "debit_note") continue;
    if (r.status === "paid" || r.status === "cancelled" || r.status === "draft") continue;
    const total = Number(r.total) || 0;
    const paid = Math.max(0, Number(r.amount_paid) || 0);
    const remaining = total - Math.min(total, paid);
    if (remaining <= 0.005) continue;
    const e = map.get(r.company_id) ?? { companyId: r.company_id, outstanding: 0, overdue: 0 };
    e.outstanding += remaining;
    if (r.status === "overdue" || (r.due_date && r.due_date.slice(0, 10) < todayIso)) e.overdue += remaining;
    map.set(r.company_id, e);
  }
  return [...map.values()].sort((a, b) => b.outstanding - a.outstanding);
}
