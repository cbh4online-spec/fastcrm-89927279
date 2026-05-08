/**
 * LeadChef — utilitários de data para Agenda (Fase 4).
 * Sem dependências externas.
 */

import type { LeadChefAppointment, LeadChefAgendaGroup } from "@/types/leadchef";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Início de semana (segunda-feira) */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const day = s.getDay(); // 0=dom
  const diff = (day === 0 ? -6 : 1 - day);
  return new Date(s.getTime() + diff * DAY_MS);
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return endOfDay(new Date(s.getTime() + 6 * DAY_MS));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isToday(input: string | Date): boolean {
  const d = toDate(input);
  const now = new Date();
  return d >= startOfDay(now) && d <= endOfDay(now);
}

export function isThisWeek(input: string | Date): boolean {
  const d = toDate(input);
  const now = new Date();
  return d >= startOfWeek(now) && d <= endOfWeek(now);
}

export function isThisMonth(input: string | Date): boolean {
  const d = toDate(input);
  const now = new Date();
  return d >= startOfMonth(now) && d <= endOfMonth(now);
}

export function isOverdue(input: string | Date): boolean {
  return toDate(input).getTime() < Date.now();
}

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatAgendaDate(input: string | Date): string {
  const d = toDate(input);
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / DAY_MS);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays === -1) return "Ontem";
  if (diffDays > 1 && diffDays <= 6) return WEEKDAY_LABELS[d.getDay()];
  return `${WEEKDAY_LABELS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

export function formatAgendaTime(input: string | Date): string {
  const d = toDate(input);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function dayKey(input: string | Date): string {
  const d = startOfDay(toDate(input));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Agrupa por dia, ordenado por hora ascendente. */
export function groupAppointmentsByDate(items: LeadChefAppointment[]): LeadChefAgendaGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
  const map = new Map<string, LeadChefAppointment[]>();
  for (const item of sorted) {
    const key = dayKey(item.scheduled_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    label: formatAgendaDate(items[0].scheduled_at),
    items,
  }));
}

/** Compõe ISO a partir de data (YYYY-MM-DD) e hora (HH:mm). */
export function combineDateTime(dateISO: string, timeHM: string): string {
  // Constrói no fuso local
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = timeHM.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).toISOString();
}

/** YYYY-MM-DD no fuso local */
export function toLocalDateInput(input: string | Date): string {
  const d = toDate(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** HH:mm no fuso local */
export function toLocalTimeInput(input: string | Date): string {
  const d = toDate(input);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
