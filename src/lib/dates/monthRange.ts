/** Primeiro e último dia (YYYY-MM-DD) de um mês. month: 1–12. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/** Rótulo legível para um intervalo; mês completo → "Setembro 2025". */
export function periodLabel(from?: string, to?: string): string {
  if (from && to) {
    const [y, m] = from.split("-").map(Number);
    if (from.endsWith("-01") && monthRange(y, m).to === to) return `${MONTHS_PT[m - 1]} ${y}`;
  }
  const fmt = (d: string) => d.split("-").reverse().join("/");
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `desde ${fmt(from)}`;
  return `até ${fmt(to!)}`;
}
