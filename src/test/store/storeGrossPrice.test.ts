import { describe, it, expect } from "vitest";
import { storeGrossPrice } from "@/hooks/useStoreTierPricing";
describe("storeGrossPrice", () => {
  it("soma 23% a produto guardado sem IVA", () => expect(storeGrossPrice(779, { tax_included: false })).toBe(958.17));
  it("mantém produto com IVA incluído", () => expect(storeGrossPrice(79.9, { tax_included: true })).toBe(79.9));
});
