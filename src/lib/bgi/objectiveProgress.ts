export type ObjectiveStatus = "achieved" | "on_track" | "at_risk" | "behind" | "no_data";
export type ObjectiveDirection = "gte" | "lte";

export const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  achieved: "Atingido", on_track: "No caminho", at_risk: "Em risco", behind: "Atrasado", no_data: "Sem dados",
};

const ymdToUtc = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return Date.UTC(y, m - 1, d); };

/** Dias de calendário (Lisboa) decorridos, incluindo hoje, numa janela [start, end). */
export function periodDays(start: string, end: string, todayYmd: string) {
  const total = Math.max(1, Math.round((ymdToUtc(end) - ymdToUtc(start)) / 86_400_000));
  const raw = Math.round((ymdToUtc(todayYmd) - ymdToUtc(start)) / 86_400_000) + 1;
  return { elapsed: Math.min(total, Math.max(0, raw)), total };
}

export function evaluateObjective(input: {
  current: number | null | undefined; target: number; direction?: ObjectiveDirection;
  start: string; end: string; todayYmd: string; cumulative?: boolean;
}) {
  const { current, target, direction = "gte", start, end, todayYmd, cumulative = true } = input;
  const { elapsed, total } = periodDays(start, end, todayYmd);
  if (current === null || current === undefined || Number.isNaN(current) || target <= 0) {
    return { pct: null, projected: null, status: "no_data" as ObjectiveStatus, elapsed, total };
  }
  const pct = Math.round((current / target) * 1000) / 10;
  // Projeção linear só para indicadores acumulados (somas/contagens); rácios mantêm o valor atual.
  const projected = cumulative && elapsed > 0 ? (current / elapsed) * total : current;
  let status: ObjectiveStatus;
  if (direction === "lte") {
    status = projected <= target ? (elapsed >= total ? "achieved" : "on_track") : current > target ? "behind" : "at_risk";
  } else if (current >= target) status = "achieved";
  else if (projected >= target) status = "on_track";
  else if (projected >= target * 0.85) status = "at_risk";
  else status = "behind";
  return { pct, projected, status, elapsed, total };
}
