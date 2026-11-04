import { describe, it, expect } from "vitest";
import { resolveWorkspaceIndicators, isAllowedFormula, INDICATORS, BUSINESS_TEMPLATES } from "../indicatorCatalog";

const ids = (r: ReturnType<typeof resolveWorkspaceIndicators>) => (r ?? []).map((i) => i.id);

describe("BGI catálogo", () => {
  it("formação não vê MRR", () => {
    expect(ids(resolveWorkspaceIndicators(["education"]))).not.toContain("mrr");
  });
  it("SaaS não vê ocupação de turmas", () => {
    expect(ids(resolveWorkspaceIndicators(["saas"]))).not.toContain("class_occupancy");
  });
  it("sem template mantém comportamento atual", () => {
    expect(resolveWorkspaceIndicators(null)).toBeNull();
    expect(resolveWorkspaceIndicators([])).toBeNull();
  });
  it("comércio + formação combina sem duplicados", () => {
    const r = ids(resolveWorkspaceIndicators(["commerce", "education"]));
    expect(new Set(r).size).toBe(r.length);
    expect(r).toContain("orders");
    expect(r).toContain("enrollments");
  });
  it("faturado e recebido são indicadores distintos", () => {
    expect(INDICATORS.revenue_invoiced.kind).toBe("invoiced");
    expect(INDICATORS.revenue_received.kind).toBe("received");
  });
  it("só fórmulas da lista permitida", () => {
    expect(isAllowedFormula("eval(1)")).toBe(false);
    Object.values(INDICATORS).forEach((i) => expect(isAllowedFormula(i.formula)).toBe(true));
    Object.values(BUSINESS_TEMPLATES).forEach((t) => t.indicators.forEach((id) => expect(INDICATORS[id]).toBeDefined()));
  });
});
