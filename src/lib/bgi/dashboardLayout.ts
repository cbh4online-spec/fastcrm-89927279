import type { IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";

export const MAX_VISIBLE_INDICATORS = 40;
const ID_RE = /^[a-z0-9_]{1,64}$/;

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

/** Remove ids inválidos e duplicados, preservando a primeira ocorrência. */
export function sanitizeLayout(layout: Partial<DashboardLayout> | null | undefined): DashboardLayout {
  const clean = (ids: unknown) =>
    Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string" && ID_RE.test(x)))].slice(0, 100) : [];
  return { order: clean(layout?.order), hidden: clean(layout?.hidden) };
}

/** Ordena todos os indicadores dos modelos: primeiro os da ordem guardada, os novos no fim. */
export function orderIndicators(indicators: IndicatorDefinition[], order: string[]): IndicatorDefinition[] {
  const byId = new Map(indicators.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out: IndicatorDefinition[] = [];
  for (const id of order) {
    const i = byId.get(id);
    if (i && !seen.has(id)) { out.push(i); seen.add(id); }
  }
  for (const i of indicators) if (!seen.has(i.id)) out.push(i);
  return out;
}

/** Indicadores visíveis no painel, na ordem configurada, com limite máximo. */
export function applyLayout(indicators: IndicatorDefinition[], layout: DashboardLayout): IndicatorDefinition[] {
  const hidden = new Set(layout.hidden);
  return orderIndicators(indicators, layout.order).filter((i) => !hidden.has(i.id)).slice(0, MAX_VISIBLE_INDICATORS);
}
