/**
 * Avenças (retainers): consumo mensal de horas.
 * Regras: ciclo = mês civil de Lisboa, sem acumulação; acima do plafond as horas
 * continuam a ser registadas e passam a "horas extra" valorizadas à taxa acordada.
 */

export type RetainerEntrySource = "project" | "ticket";

export interface RetainerEntry {
  id: string;
  source: RetainerEntrySource;
  /** YYYY-MM-DD no calendário de Lisboa */
  date: string;
  minutes: number;
  billable: boolean;
  description: string | null;
  userId: string | null;
  parentId: string;
  parentLabel: string;
}

export interface RetainerUsage {
  includedMinutes: number;
  projectMinutes: number;
  ticketMinutes: number;
  usedMinutes: number;
  nonBillableMinutes: number;
  remainingMinutes: number;
  overageMinutes: number;
  overageCost: number;
  /** % do plafond consumido (pode passar 100) */
  pct: number;
  level: "ok" | "warning" | "critical" | "over";
}

/** Data YYYY-MM-DD de um instante no calendário de Lisboa. */
export function lisbonDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}

export function entriesInMonth(entries: RetainerEntry[], monthKey: string): RetainerEntry[] {
  return entries.filter((e) => e.date.slice(0, 7) === monthKey);
}

export function computeRetainerUsage(
  entries: RetainerEntry[],
  includedHours: number,
  overageHourlyRate: number,
): RetainerUsage {
  const includedMinutes = Math.round(Math.max(0, includedHours) * 60);
  let projectMinutes = 0, ticketMinutes = 0, nonBillableMinutes = 0;
  for (const e of entries) {
    const m = Math.max(0, Math.round(e.minutes || 0));
    if (!e.billable) { nonBillableMinutes += m; continue; }
    if (e.source === "project") projectMinutes += m; else ticketMinutes += m;
  }
  const usedMinutes = projectMinutes + ticketMinutes;
  const overageMinutes = Math.max(0, usedMinutes - includedMinutes);
  const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);
  const overageCost = Math.round((overageMinutes / 60) * Math.max(0, overageHourlyRate) * 100) / 100;
  const pct = includedMinutes > 0 ? (usedMinutes / includedMinutes) * 100 : usedMinutes > 0 ? 100 : 0;
  const level = overageMinutes > 0 ? "over" : pct >= 90 ? "critical" : pct >= 75 ? "warning" : "ok";
  return { includedMinutes, projectMinutes, ticketMinutes, usedMinutes, nonBillableMinutes, remainingMinutes, overageMinutes, overageCost, pct, level };
}

export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${String(r).padStart(2, "0")}m`;
}

/** Converte "1:30", "1h30", "1,5" ou "90m" em minutos. Devolve null se inválido. */
export function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+)\s*[:h]\s*(\d{1,2})\s*m?$/))) return Number(m[1]) * 60 + Number(m[2]);
  if ((m = s.match(/^(\d+)\s*m(in)?$/))) return Number(m[1]);
  if ((m = s.match(/^(\d+(\.\d+)?)\s*h?$/))) return Math.round(Number(m[1]) * 60);
  return null;
}

/**
 * A mensalidade só é devida em meses em que a avença está ativa e dentro do período
 * (mês ≥ mês de início e, se houver fim, mês ≤ mês de fim). monthKey = "YYYY-MM".
 */
export function isRetainerBillableMonth(
  r: { status: string; start_date: string; end_date?: string | null },
  monthKey: string,
): boolean {
  if (r.status !== "active") return false;
  if (monthKey < r.start_date.slice(0, 7)) return false;
  if (r.end_date && monthKey > r.end_date.slice(0, 7)) return false;
  return true;
}

export interface RetainerInvoiceLine { description: string; quantity: number; unit_price: number; tax_rate: number; }

/** Marcador único por avença+mês, guardado nas notas, para impedir faturas duplicadas. */
export function retainerInvoiceTag(retainerId: string, monthKey: string) {
  return `[avenca:${retainerId}:${monthKey}]`;
}

/**
 * Linhas do rascunho de fatura do mês: mensalidade (só se o mês é faturável)
 * + horas extra (horas decimais arredondadas a 2 casas × taxa). Valores sem IVA.
 */
export function buildRetainerInvoiceLines(
  retainer: { name: string; monthly_fee: number; overage_hourly_rate: number },
  monthKey: string,
  usage: Pick<RetainerUsage, "overageMinutes">,
  feeDue: boolean,
  taxRate = 23,
): RetainerInvoiceLine[] {
  const [y, m] = monthKey.split("-");
  const period = `${m}/${y}`;
  const lines: RetainerInvoiceLine[] = [];
  const fee = Number(retainer.monthly_fee) || 0;
  if (feeDue && fee > 0) lines.push({ description: `Avença ${retainer.name} — ${period}`, quantity: 1, unit_price: fee, tax_rate: taxRate });
  const hours = Math.round((usage.overageMinutes / 60) * 100) / 100;
  const rate = Number(retainer.overage_hourly_rate) || 0;
  if (hours > 0 && rate > 0) lines.push({ description: `Horas extra ${retainer.name} — ${period} (${formatMinutes(usage.overageMinutes)})`, quantity: hours, unit_price: rate, tax_rate: taxRate });
  return lines;
}
