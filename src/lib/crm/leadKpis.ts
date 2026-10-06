export interface LeadKpiRow { ai_temperature?: string | null; estimated_value?: number | string | null; last_contact_at?: string | null; lead_score?: number | null }
/** KPIs calculados sobre as linhas recebidas (a página atual); o âmbito é mostrado ao utilizador. */
export function computeLeadPageKpis(rows: LeadKpiRow[], now = Date.now()) {
  let hot = 0, pipeline = 0, stale = 0, scored = 0, scoreSum = 0;
  const staleCut = now - 14 * 86_400_000;
  for (const l of rows) {
    if ((l.ai_temperature || "").toLowerCase() === "hot") hot += 1;
    pipeline += Number(l.estimated_value) || 0;
    const ts = l.last_contact_at ? new Date(l.last_contact_at).getTime() : 0;
    if (!ts || ts < staleCut) stale += 1;
    if (l.lead_score != null) { scored += 1; scoreSum += Number(l.lead_score) || 0; }
  }
  return { hot, pipeline, stale, avg: scored > 0 ? Math.round(scoreSum / scored) : 0 };
}
