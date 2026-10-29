/** Regras da pontuação de leads face ao cliente ideal (ICP). Espelhado em supabase/functions/score-leads-icp/rules.ts */
export const CALL_WORTHY_THRESHOLD = 70;

export function isCallWorthy(score: number | null | undefined): boolean {
  return typeof score === "number" && score >= CALL_WORTHY_THRESHOLD;
}

export interface IcpScoreResult {
  score: number;
  summary: string;
  reasons: string[];
}

/** Valida e normaliza a resposta da IA; devolve null se inválida. */
export function parseIcpScore(raw: unknown): IcpScoreResult | null {
  let obj: any = raw;
  if (typeof raw === "string") {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { obj = JSON.parse(m[0]); } catch { return null; }
  }
  if (!obj || typeof obj !== "object") return null;
  const score = Number(obj.score);
  if (!Number.isFinite(score)) return null;
  const summary = typeof obj.summary === "string" ? obj.summary.trim().slice(0, 300) : "";
  if (!summary) return null;
  const reasons = Array.isArray(obj.reasons)
    ? obj.reasons.filter((r: unknown) => typeof r === "string" && r.trim()).map((r: string) => r.trim().slice(0, 80)).slice(0, 3)
    : [];
  return { score: Math.round(Math.min(100, Math.max(0, score))), summary, reasons };
}
