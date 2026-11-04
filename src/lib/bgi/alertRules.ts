import type { ObjectiveStatus } from "@/lib/bgi/objectiveProgress";

export interface AlertThresholds { drop_pct: number; risk_pct: number }
export const DEFAULT_THRESHOLDS: AlertThresholds = { drop_pct: 20, risk_pct: 90 };

export function sanitizeThresholds(raw: unknown): AlertThresholds {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof AlertThresholds) => {
    const v = Number(o[k]);
    return Number.isFinite(v) && v >= 1 && v <= 100 ? Math.round(v) : DEFAULT_THRESHOLDS[k];
  };
  return { drop_pct: pick("drop_pct"), risk_pct: pick("risk_pct") };
}

export type AlertKind = "objective_risk" | "indicator_drop" | "open_balance_up" | "weak_pipeline";
export interface BgiAlert { key: string; kind: AlertKind; severity: "warning" | "critical"; title: string; detail: string; targetId: string }

type Values = Record<string, number | null | undefined>;
export interface AlertInput {
  current: Values; previous: Values;
  indicators: { id: string; name: string; formula: string }[];
  objectives: { indicatorId: string; name: string; target: number; projected: number | null; status: ObjectiveStatus; elapsed: number; total: number; formula: string }[];
  thresholds: AlertThresholds;
}

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmtPct = (v: number) => `${v.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

/** Regras puras: usam só valores calculados no servidor (bgi_compute_indicators + objetivos). */
export function evaluateAlerts({ current, previous, indicators, objectives, thresholds }: AlertInput): BgiAlert[] {
  const out: BgiAlert[] = [];

  for (const o of objectives) {
    if (o.status === "achieved" || o.status === "no_data" || o.projected === null || o.target <= 0) continue;
    if (o.elapsed * 2 < o.total) continue; // só a partir de meio do período
    const ratio = (o.projected / o.target) * 100;
    if (ratio < thresholds.risk_pct) {
      out.push({ key: `objective:${o.indicatorId}`, kind: "objective_risk", severity: ratio < thresholds.risk_pct - 20 ? "critical" : "warning",
        title: `Objetivo em risco: ${o.name}`, detail: `Projeção a ${fmtPct(ratio)} do alvo (limite ${thresholds.risk_pct}%).`, targetId: `objective-${o.indicatorId}` });
    }
  }

  const seen = new Set<string>();
  for (const i of indicators) {
    if (i.formula === "sum_open_balance" || seen.has(i.formula)) continue;
    const c = num(current[i.formula]); const p = num(previous[i.formula]);
    if (c === null || p === null || p <= 0) continue;
    const drop = ((p - c) / p) * 100;
    if (drop >= thresholds.drop_pct) {
      seen.add(i.formula);
      out.push({ key: `drop:${i.formula}`, kind: "indicator_drop", severity: drop >= thresholds.drop_pct * 2 ? "critical" : "warning",
        title: `Queda em ${i.name}`, detail: `−${fmtPct(drop)} face ao período anterior (limite ${thresholds.drop_pct}%).`, targetId: `kpi-${i.id}` });
    }
  }

  const ob = num(current.sum_open_balance); const obp = num(previous.sum_open_balance);
  if (ob !== null && obp !== null && ob > obp && obp > 0) {
    out.push({ key: "open_balance_up", kind: "open_balance_up", severity: "warning", title: "Saldo em aberto a subir",
      detail: `+${fmtPct(((ob - obp) / obp) * 100)} face ao período anterior.`, targetId: "kpi-open_balance" });
  }

  const billing = objectives.find((o) => o.formula === "sum_invoiced_net");
  const wp = num(current.weighted_pipeline); const inv = num(current.sum_invoiced_net);
  if (billing && wp !== null && inv !== null) {
    const remaining = billing.target - inv;
    if (remaining > 0 && wp < remaining) {
      out.push({ key: "weak_pipeline", kind: "weak_pipeline", severity: "warning", title: "Pipeline insuficiente",
        detail: `Pipeline ponderado abaixo do que falta faturar para o objetivo.`, targetId: `objective-${billing.indicatorId}` });
    }
  }
  return out;
}

const SOURCE_LABELS: Record<string, string> = {
  ghl: "GHL", email: "Email", "lead-enricher": "Enriquecimento", professional_prospecting: "Prospeção",
  google_local: "Google", instagram_extractor: "Instagram", registo: "Registo", web_search: "Pesquisa web",
  outro: "Outro", sem_origem: "Sem origem",
};
export const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s;
export const stepRate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
