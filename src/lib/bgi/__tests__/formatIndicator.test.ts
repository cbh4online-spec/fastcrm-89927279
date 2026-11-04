import { describe, expect, it } from "vitest";
import { computeDelta, formatIndicatorValue, isSupportedFormula } from "../formatIndicator";

describe("BGI formatIndicator", () => {
  it("mostra «Sem dados» em vez de 0 quando não há valor", () => {
    expect(formatIndicatorValue(null, "eur")).toBe("Sem dados");
  });
  it("variação é null quando a base é 0", () => {
    expect(computeDelta(100, 0)).toBeNull();
  });
  it("variação calculada sobre a base", () => {
    expect(computeDelta(120, 100)).toBe(20);
    expect(computeDelta(80, 100)).toBe(-20);
  });
  it("MRR fica «Em breve» nesta etapa e faturação é calculada", () => {
    expect(isSupportedFormula("mrr")).toBe(false);
    expect(isSupportedFormula("sum_invoiced_net")).toBe(true);
  });
});
