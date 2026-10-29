/** "YYYY-MM" do mês atual no calendário de Lisboa. */
export function lisbonMonthKey(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
}
/** Data "YYYY-MM-DD…" pertence ao mês atual (Lisboa)? */
export function isInCurrentMonth(date: string | null | undefined, now: Date = new Date()): boolean {
  return !!date && date.slice(0, 7) === lisbonMonthKey(now);
}
