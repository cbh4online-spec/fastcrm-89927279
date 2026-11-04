import { describe, it, expect } from "vitest";
import { buildInsightsPayload, stableHash } from "../insightsPayload";
import { sanitizeInsights } from "../insightsSchema";

const inds = [
  { id: "revenue_invoiced", name: "Faturação", unit: "eur", formula: "sum_invoiced_net" },
  { id: "mrr", name: "MRR", unit: "eur", formula: "mrr" },
];

describe("insights payload", () => {
  it("só inclui indicadores com valor e objetivos desses indicadores", () => {
    const p = buildInsightsPayload(inds, { current: { sum_invoiced_net: 100 }, previous: {}, yoy: {} },
      [{ indicator_id: "revenue_invoiced", target_value: 200, direction: "gte" }, { indicator_id: "mrr", target_value: 5, direction: "gte" }]);
    expect(p.indicators.map((i) => i.id)).toEqual(["revenue_invoiced"]);
    expect(p.objectives).toHaveLength(1);
  });
  it("hash muda quando os dados mudam", () => {
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
    expect(stableHash({ a: 1 })).toBe(stableHash({ a: 1 }));
  });
});

describe("insights schema", () => {
  it("remove afirmações sobre indicadores não permitidos", () => {
    const r = sanitizeInsights({ summary: "Ok", highlights: [{ text: "x", indicator_id: "revenue_invoiced" }, { text: "y", indicator_id: "inventado" }], alerts: [], objectives_at_risk: [], actions: [] }, new Set(["revenue_invoiced"]));
    expect(r?.highlights).toHaveLength(1);
  });
  it("rejeita resposta sem resumo ou com mais de 5 ações", () => {
    expect(sanitizeInsights({ summary: "" }, new Set())).toBeNull();
    const a = Array.from({ length: 6 }, () => ({ text: "t", indicator_id: "x" }));
    expect(sanitizeInsights({ summary: "s", actions: a }, new Set())).toBeNull();
  });
});
