/**
 * Diagnóstico Executivo (BGI) — tipos e regras de leitura dos valores
 * calculados no servidor por `bgi_executive_diagnostics`. Nunca recalcula
 * montantes no browser; apenas classifica riscos e períodos.
 */

export interface DiagCustomer { id: string; type: "company" | "contact"; name: string; net: number; invoices: number; share: number | null; open: number }
export interface DiagDebtor { id: string; type: "company" | "contact"; name: string; balance: number; max_overdue_days: number; invoices: number }
export interface ExecutiveDiagnostics {
  start: string; end: string; today: string;
  concentration: { total_net: number; customers: number; top3_share: number | null; top10_share: number | null; top20_share: number | null; customers_for_80pct: number | null; top: DiagCustomer[] };
  collection: { invoiced_gross: number; paid_gross: number; rate: number | null };
  aging: { total: number; invoices: number; not_due: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; top_debtors: DiagDebtor[] };
}

export type DiagRange = "ytd" | "last_12m" | "last_year";
export const DIAG_RANGES: { key: DiagRange; label: string }[] = [
  { key: "ytd", label: "Este ano" },
  { key: "last_12m", label: "Últimos 12 meses" },
  { key: "last_year", label: "Ano anterior" },
];

/** Datas [início, fim) em dias de calendário de Lisboa. `today` = AAAA-MM-DD. */
export function resolveDiagRange(range: DiagRange, today: string): { start: string; end: string } {
  const [y, m, d] = today.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (range === "last_year") return { start: `${y - 1}-01-01`, end: `${y}-01-01` };
  if (range === "last_12m") {
    const s = new Date(Date.UTC(y - 1, m - 1, d + 1)).toISOString().slice(0, 10);
    return { start: s, end: next };
  }
  return { start: `${y}-01-01`, end: next };
}

export type RiskLevel = "ok" | "warning" | "critical";

/** Dependência: top 3 > 50% crítico, > 30% aviso. */
export function concentrationRisk(top3Share: number | null): RiskLevel {
  if (top3Share == null) return "ok";
  if (top3Share > 50) return "critical";
  if (top3Share > 30) return "warning";
  return "ok";
}

/** Cobrança: < 80% crítico, < 95% aviso. */
export function collectionRisk(rate: number | null): RiskLevel {
  if (rate == null) return "ok";
  if (rate < 80) return "critical";
  if (rate < 95) return "warning";
  return "ok";
}

/** Saldos: > 20% do em aberto com mais de 60 dias de atraso é crítico, > 10% aviso. */
export function agingRisk(a: ExecutiveDiagnostics["aging"]): RiskLevel {
  if (!a.total) return "ok";
  const share = (a.d61_90 + a.d90_plus) / a.total;
  if (share > 0.2) return "critical";
  if (share > 0.1) return "warning";
  return "ok";
}

export function entityPath(type: "company" | "contact", id: string) {
  return type === "company" ? `/dashboard/companies/${id}` : `/dashboard/contacts/${id}`;
}

// ---------- Fase 2: comportamento de compra ----------
export interface DormantCustomer { id: string; type: "company" | "contact"; name: string; last_date: string; idle_days: number; purchases: number; avg_gap_days: number | null; value12: number }
export type TicketBucketKey = "lt100" | "100_300" | "300_1000" | "gte1000";
export interface CustomerBehavior {
  start: string; end: string; today: string;
  frequency: { recurring_customers: number; median_gap_days: number | null };
  dormant: { count: number; d61_90: number; d91_180: number; d180_plus: number; value_at_risk: number; top: DormantCustomer[] };
  tickets: { count: number; avg: number | null; median: number | null; buckets: { key: TicketBucketKey; count: number; value: number }[] };
}
export const TICKET_LABEL: Record<TicketBucketKey, string> = {
  lt100: "Menos de 100 €", "100_300": "100 – 300 €", "300_1000": "300 – 1.000 €", gte1000: "1.000 € ou mais",
};

/** Cliente parado há mais do dobro do seu intervalo habitual (mín. 60 dias) = atraso anormal. */
export function isOverdueVsHabit(idleDays: number, avgGapDays: number | null): boolean {
  if (avgGapDays == null || avgGapDays <= 0) return idleDays > 90;
  return idleDays > Math.max(60, 2 * avgGapDays);
}

/** Faturas pequenas: > 50% das faturas abaixo de 100 € é aviso (esforço operacional elevado). */
export function smallTicketRisk(b: CustomerBehavior["tickets"]): RiskLevel {
  if (!b.count) return "ok";
  const small = b.buckets.find((x) => x.key === "lt100")?.count ?? 0;
  const share = small / b.count;
  if (share > 0.7) return "critical";
  if (share > 0.5) return "warning";
  return "ok";
}

/** Valor em risco de clientes parados face à faturação do período: > 20% crítico, > 10% aviso. */
export function dormantRisk(valueAtRisk: number, totalNet: number): RiskLevel {
  if (!totalNet || totalNet <= 0) return valueAtRisk > 0 ? "warning" : "ok";
  const share = valueAtRisk / totalNet;
  if (share > 0.2) return "critical";
  if (share > 0.1) return "warning";
  return "ok";
}
