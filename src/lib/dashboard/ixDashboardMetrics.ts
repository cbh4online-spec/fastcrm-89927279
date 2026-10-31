/**
 * Métricas do painel inicial (Visão Global IX) calculadas a partir das faturas.
 * Regras alinhadas com useWorkspaceFinancials: só documentos emitidos
 * (sent/partially_paid/paid/overdue), sem rascunhos, proformas ou anulados.
 */
import { countsAsBilledRevenue } from "@/hooks/useWorkspaceFinancials";

export interface MetricInvoice {
  status: string | null;
  document_type?: string | null;
  issue_date: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  tax_rate?: number | string | null;
  amount_paid?: number | string | null;
}

const ISSUED_STATUSES = new Set(["sent", "partially_paid", "paid", "overdue"]);

export function isIssuedDocument(inv: Pick<MetricInvoice, "status">): boolean {
  return !!inv.status && ISSUED_STATUSES.has(inv.status);
}

/** "YYYY-MM" do mês corrente no calendário de Lisboa. */
export function lisbonMonthKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

/** Faturas (FT) e faturas-recibo (FR) emitidas no mês corrente (Lisboa). */
export function computeMonthMetrics(invoices: MetricInvoice[], now: Date = new Date()) {
  const key = lisbonMonthKey(now);
  const month = invoices.filter(
    (i) =>
      !!i.issue_date &&
      i.issue_date.slice(0, 7) === key &&
      isIssuedDocument(i) &&
      countsAsBilledRevenue(i.document_type),
  );
  const total = month.reduce((s, i) => s + Number(i.total || 0), 0);
  const paid = month.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  return { count: month.length, total, paid, outstanding: total - paid };
}

/** IVA por taxa: documentos emitidos; notas de crédito abatem base e IVA. */
export function computeVatByRate(invoices: MetricInvoice[]) {
  const map = new Map<number, { base: number; tax: number; count: number }>();
  let documents = 0;
  for (const i of invoices) {
    if (!isIssuedDocument(i)) continue;
    const sign = i.document_type === "credit_note" ? -1 : 1;
    const rate = Number(i.tax_rate || 0);
    const cur = map.get(rate) ?? { base: 0, tax: 0, count: 0 };
    cur.base += sign * Number(i.subtotal || 0);
    cur.tax += sign * Number(i.tax_amount || 0);
    cur.count += 1;
    map.set(rate, cur);
    documents += 1;
  }
  const rows = Array.from(map.entries())
    .map(([rate, v]) => ({ rate, ...v }))
    .sort((a, b) => b.tax - a.tax);
  return { rows, documents, totalVat: rows.reduce((s, r) => s + r.tax, 0) };
}

/** Casos de cobrança ainda em aberto (pagos e fechados ficam de fora). */
export function isOpenCollectionCase(status: string | null | undefined): boolean {
  return status !== "paid" && status !== "closed";
}
