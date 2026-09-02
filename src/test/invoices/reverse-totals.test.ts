import { describe, expect, it } from "vitest";
import {
  computeTotals,
  distributeTargetTotal,
  unitPriceFromLineTotal,
} from "@/lib/invoices/reverseTotals";

const line = (over: Partial<Parameters<typeof unitPriceFromLineTotal>[0]> = {}) => ({
  quantity: 1,
  unit_price: 100,
  discount_percent: 0,
  tax_rate: 23,
  ...over,
});

describe("unitPriceFromLineTotal", () => {
  it("deduz o preço unitário a partir do total c/IVA", () => {
    expect(unitPriceFromLineTotal(line(), 15)).toBe(12.2);
  });

  it("respeita quantidade e desconto de linha", () => {
    const item = line({ quantity: 3, discount_percent: 10, tax_rate: 6 });
    const price = unitPriceFromLineTotal(item, 100)!;
    const totals = computeTotals([{ ...item, unit_price: price }]);
    expect(totals.total).toBeCloseTo(100, 1);
  });

  it("devolve null quando a linha não é solúvel", () => {
    expect(unitPriceFromLineTotal(line({ quantity: 0 }), 50)).toBeNull();
    expect(unitPriceFromLineTotal(line({ discount_percent: 100 }), 50)).toBeNull();
  });
});

describe("distributeTargetTotal", () => {
  it("ajusta proporcionalmente até ao cêntimo", () => {
    const items = [line({ unit_price: 100 }), line({ unit_price: 300 })];
    const result = distributeTargetTotal(items, 0, 500);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(computeTotals(result.items).total).toBe(500);
    expect(result.items[1].unit_price).toBeGreaterThan(result.items[0].unit_price);
  });

  it("funciona com IVA misto", () => {
    const items = [line({ unit_price: 80, tax_rate: 23 }), line({ unit_price: 40, tax_rate: 6 })];
    const result = distributeTargetTotal(items, 0, 250);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(computeTotals(result.items).total).toBe(250);
  });

  it("considera o desconto global", () => {
    const items = [line({ unit_price: 100 }), line({ unit_price: 50 })];
    const result = distributeTargetTotal(items, 20, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(computeTotals(result.items, 20).total).toBe(300);
  });

  it("recusa quando não há base ou o alvo é inválido", () => {
    expect(distributeTargetTotal([], 0, 100)).toEqual({ ok: false, reason: "no_base" });
    expect(distributeTargetTotal([line({ unit_price: 0 })], 0, 100)).toEqual({
      ok: false,
      reason: "no_base",
    });
    expect(distributeTargetTotal([line()], 0, -5)).toEqual({
      ok: false,
      reason: "invalid_target",
    });
  });
});

describe("precisão de preço unitário (6 casas)", () => {
  it("total de linha 15,00 com IVA 23% e qty 1 bate exactamente", () => {
    const item = { quantity: 1, unit_price: 12.2, discount_percent: 0, tax_rate: 23 };
    const price = unitPriceFromLineTotal(item, 15);
    expect(price).not.toBeNull();
    const next = { ...item, unit_price: price as number };
    expect(computeTotals([next], 0).total).toBe(15);
  });

  it("total geral escrito bate ao cêntimo com IVA misto e desconto global", () => {
    const items = [
      { quantity: 2, unit_price: 33.33, discount_percent: 0, tax_rate: 23 },
      { quantity: 1, unit_price: 10, discount_percent: 10, tax_rate: 6 },
    ];
    const result = distributeTargetTotal(items, 5, 1000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(computeTotals(result.items, 5).total).toBe(1000);
  });
});
