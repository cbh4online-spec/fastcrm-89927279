/**
 * Janelas de envio em Europe/Lisbon (ou fuso da campanha), sem dependências.
 * Por defeito: segunda a sexta, 09:00–19:00, Europe/Lisbon.
 */

export interface SendWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  days: number[]; // 0=domingo … 6=sábado
  timezone: string;
}

export const DEFAULT_WINDOW: SendWindow = { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5], timezone: "Europe/Lisbon" };

export function parseWindow(raw: unknown): SendWindow {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const hhmm = (v: unknown, d: string) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : d);
  const days = Array.isArray(r.days) && r.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) && r.days.length
    ? (r.days as number[])
    : DEFAULT_WINDOW.days;
  const tz = typeof r.timezone === "string" && r.timezone ? r.timezone : DEFAULT_WINDOW.timezone;
  const w = { start: hhmm(r.start, DEFAULT_WINDOW.start), end: hhmm(r.end, DEFAULT_WINDOW.end), days, timezone: tz };
  return w.start < w.end ? w : DEFAULT_WINDOW;
}

interface Parts { y: number; m: number; d: number; hh: number; mm: number; dow: number }

function zonedParts(date: Date, tz: string): Parts {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, dow: dows.indexOf(p.weekday) };
}

/** Converte hora de parede (fuso tz) em instante UTC. */
function wallToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = zonedParts(new Date(guess), tz);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm) - guess;
  let res = guess - offset;
  const p2 = zonedParts(new Date(res), tz);
  const offset2 = Date.UTC(p2.y, p2.m - 1, p2.d, p2.hh, p2.mm) - res;
  if (offset2 !== offset) res = guess - offset2;
  return new Date(res);
}

export function isInWindow(date: Date, w: SendWindow): boolean {
  const p = zonedParts(date, w.timezone);
  const hm = `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
  return w.days.includes(p.dow) && hm >= w.start && hm < w.end;
}

/** Primeiro instante >= `from` dentro da janela. */
export function nextAllowedAt(from: Date, w: SendWindow): Date {
  if (isInWindow(from, w)) return from;
  const [sh, sm] = w.start.split(":").map(Number);
  for (let i = 0; i < 9; i++) {
    const probe = new Date(from.getTime() + i * 86_400_000);
    const p = zonedParts(probe, w.timezone);
    const candidate = wallToUtc(p.y, p.m, p.d, sh, sm, w.timezone);
    if (candidate.getTime() >= from.getTime() && isInWindow(candidate, w)) return candidate;
  }
  return from; // janela inválida — não deve acontecer (parseWindow garante days não vazio)
}

export interface StepTiming { delay_days?: number | null; delay_hours?: number | null }

export function stepDelayMs(s: StepTiming): number {
  return (Math.max(0, s.delay_days ?? 0) * 86400 + Math.max(0, s.delay_hours ?? 0) * 3600) * 1000;
}

/** Data da etapa: base + atraso, ajustada à janela. */
export function scheduleStep(base: Date, step: StepTiming, w: SendWindow): Date {
  return nextAllowedAt(new Date(base.getTime() + stepDelayMs(step)), w);
}

/** Backoff exponencial: 15 min, 30 min, 60 min… (máx. 6 h). */
export function retryBackoffMs(attemptCount: number): number {
  return Math.min(15 * 60_000 * 2 ** Math.max(0, attemptCount - 1), 6 * 3600_000);
}
