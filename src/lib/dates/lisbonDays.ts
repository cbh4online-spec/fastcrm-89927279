/** Dias de calendário em Europe/Lisbon (sem truncagem por horas). */
const TZ = "Europe/Lisbon";
function lisbonYmd(d: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return [get("year"), get("month"), get("day")];
}
/** Converte "YYYY-MM-DD" (data pura) ou timestamp para dia de calendário em Lisboa. */
function toDayNumber(value: string | Date): number {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  }
  const [y, m, d] = lisbonYmd(typeof value === "string" ? new Date(value) : value);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}
/** Diferença em dias de calendário (target − hoje). Negativo = em atraso. */
export function calendarDaysFromToday(target: string | Date, now: Date = new Date()): number {
  return Math.round(toDayNumber(target) - toDayNumber(now));
}
/** Rótulo relativo pt-PT com singular/plural correto. */
export function relativeDayLabel(days: number): string {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days === -1) return "1 dia de atraso";
  if (days < 0) return `${Math.abs(days)} dias de atraso`;
  return `em ${days} dias`;
}
