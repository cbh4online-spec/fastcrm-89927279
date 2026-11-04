import { describe, it, expect } from "vitest";
import { evaluateAlerts, sanitizeThresholds, sourceLabel, stepRate, DEFAULT_THRESHOLDS } from "../alertRules";

const base = { indicators: [], objectives: [], thresholds: DEFAULT_THRESHOLDS, current: {}, previous: {} };

describe("alertRules", () => {
  it("objetivo com projeção abaixo de 90% a meio do período gera alerta", () => {
    const a = evaluateAlerts({ ...base, objectives: [{ indicatorId: "rev", name: "Faturação", target: 1000, projected: 850, status: "at_risk", elapsed: 15, total: 30, formula: "sum_invoiced_net" }] });
    expect(a.map((x) => x.kind)).toContain("objective_risk");
  });
  it("antes de meio do período não alerta objetivo", () => {
    const a = evaluateAlerts({ ...base, objectives: [{ indicatorId: "rev", name: "F", target: 1000, projected: 100, status: "behind", elapsed: 5, total: 30, formula: "x" }] });
    expect(a).toHaveLength(0);
  });
  it("queda de 20% gera alerta, 19% não", () => {
    const ind = [{ id: "rev", name: "Faturação", formula: "sum_invoiced_net" }];
    expect(evaluateAlerts({ ...base, indicators: ind, current: { sum_invoiced_net: 80 }, previous: { sum_invoiced_net: 100 } })).toHaveLength(1);
    expect(evaluateAlerts({ ...base, indicators: ind, current: { sum_invoiced_net: 81 }, previous: { sum_invoiced_net: 100 } })).toHaveLength(0);
  });
  it("limites fora de 1–100 voltam ao padrão", () => {
    expect(sanitizeThresholds({ drop_pct: 0, risk_pct: 150 })).toEqual(DEFAULT_THRESHOLDS);
  });
  it("origens e taxas", () => {
    expect(sourceLabel("ghl")).toBe("GHL");
    expect(stepRate(1, 4)).toBe(25);
    expect(stepRate(1, 0)).toBeNull();
  });
});
