import { describe, it, expect } from "vitest";
import { computeUndercutPrice, totalProductCost } from "@/lib/pricing/undercutPricing";

const base = {
  taxIncluded: true,
  vatRatePct: 23,
  minMarginPct: 10,
  undercutPct: 1,
  maxDropPct: 50,
};

describe("computeUndercutPrice", () => {
  it("aplica 1% abaixo do menor concorrente quando a margem permite", () => {
    const r = computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: 100, totalCost: 30 });
    expect(r.shouldApply).toBe(true);
    expect(r.proposedPrice).toBe(99);
    expect(r.limitedByMargin).toBe(false);
    expect(r.reason).toBe("applied");
  });

  it("desce apenas até ao limite da margem mínima", () => {
    // custo 83.5 -> líquido mínimo 92.78 -> bruto mínimo ~114.12 (acima do alvo 113.85)
    const r = computeUndercutPrice({ ...base, currentPrice: 130, competitorLowest: 115, totalCost: 83.5 });
    expect(r.shouldApply).toBe(true);
    expect(r.limitedByMargin).toBe(true);
    expect(r.reason).toBe("limited_by_margin");
    expect(r.proposedPrice).toBeGreaterThan(113.85);
    expect(r.proposedPrice!).toBeLessThanOrEqual(115);
  });

  it("não altera quando nem no limite da margem fica abaixo da concorrência", () => {
    const r = computeUndercutPrice({ ...base, currentPrice: 130, competitorLowest: 90, totalCost: 90 });
    expect(r.shouldApply).toBe(false);
    expect(r.reason).toBe("insufficient_margin");
  });

  it("não sobe preços quando já está abaixo do alvo", () => {
    const r = computeUndercutPrice({ ...base, currentPrice: 80, competitorLowest: 100, totalCost: 30 });
    expect(r.shouldApply).toBe(false);
    expect(r.reason).toBe("already_below");
  });

  it("ignora produtos sem custo conhecido", () => {
    const r = computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: 100, totalCost: null });
    expect(r.reason).toBe("no_cost");
  });

  it("ignora produtos sem referências válidas", () => {
    expect(computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: null, totalCost: 30 }).reason).toBe("no_valid_reference");
    expect(
      computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: 100, competitorRefsCount: 0, totalCost: 30 }).reason,
    ).toBe("no_valid_reference");
  });

  it("ignora preço sob consulta e produtos excluídos", () => {
    expect(computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: 100, totalCost: 30, priceOnRequest: true }).reason).toBe("price_on_request");
    expect(computeUndercutPrice({ ...base, currentPrice: 120, competitorLowest: 100, totalCost: 30, autoPriceExcluded: true }).reason).toBe("excluded");
  });

  it("bloqueia descidas superiores ao limite por execução", () => {
    const r = computeUndercutPrice({ ...base, maxDropPct: 5, currentPrice: 200, competitorLowest: 100, totalCost: 30 });
    expect(r.shouldApply).toBe(false);
    expect(r.reason).toBe("drop_too_large");
  });

  it("soma custo direto e operacional", () => {
    expect(totalProductCost(10, 2.5)).toBe(12.5);
    expect(totalProductCost(null, null)).toBe(0);
  });
});
