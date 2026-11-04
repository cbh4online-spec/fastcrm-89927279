/**
 * Monta o resumo enviado à IA: apenas nomes de indicadores e números agregados
 * (nunca dados de clientes). Espelhado em supabase/functions/bgi-insights/payload.ts.
 */
export interface PayloadIndicator { id: string; name: string; unit: string; formula: string }
export interface PayloadObjective { indicator_id: string; target_value: number; direction: string }
type Values = Record<string, number | null | undefined>;

export function buildInsightsPayload(
  indicators: PayloadIndicator[],
  values: { current: Values; previous: Values; yoy: Values },
  objectives: PayloadObjective[],
) {
  const items = indicators
    .map((i) => ({ id: i.id, name: i.name, unit: i.unit, current: values.current?.[i.formula] ?? null, previous: values.previous?.[i.formula] ?? null, yoy: values.yoy?.[i.formula] ?? null }))
    .filter((i) => typeof i.current === "number" && Number.isFinite(i.current));
  const ids = new Set(items.map((i) => i.id));
  const goals = objectives.filter((o) => ids.has(o.indicator_id)).map((o) => ({ indicator_id: o.indicator_id, target: o.target_value, direction: o.direction }));
  return { indicators: items, objectives: goals, allowedIds: ids };
}

/** Hash estável (FNV-1a) para saber se os dados mudaram desde a última análise. */
export function stableHash(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
