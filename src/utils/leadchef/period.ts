export type LeadChefPeriod = "today" | "week" | "month";

export function getPeriodRange(period: LeadChefPeriod): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: "Hoje" };
  }
  if (period === "week") {
    const day = (now.getDay() + 6) % 7; // monday=0
    from.setDate(now.getDate() - day);
    from.setHours(0, 0, 0, 0);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: "Esta semana" };
  }
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  to.setMonth(now.getMonth() + 1, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to, label: "Este mês" };
}
