import { describe, it, expect } from "vitest";
import { calculateProductMargins } from "@/types/product";

const base: any = { base_price: 123, direct_cost: 50, operational_cost: 10, tax_included: true, tax_rate_estimate_pct: 23 };

describe("calculateProductMargins", () => {
  it("retira o IVA quando o preço inclui IVA", () => {
    const m = calculateProductMargins(base);
    expect(m.gross_margin_pct).toBeCloseTo(50, 5); // (100-50)/100
  });
  it("margem de contribuição inclui custo operacional", () => {
    expect(calculateProductMargins(base).contribution_margin_pct).toBeCloseTo(40, 5);
  });
  it("preço sem IVA usa-se tal como está", () => {
    const m = calculateProductMargins({ ...base, base_price: 100, tax_included: false });
    expect(m.gross_margin_pct).toBeCloseTo(50, 5);
  });
});
