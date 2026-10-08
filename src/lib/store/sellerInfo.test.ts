import { describe, it, expect } from "vitest";
import { isValidPtNif, validateSeller } from "./sellerInfo";

describe("sellerInfo", () => {
  it("valida NIF", () => {
    expect(isValidPtNif("509625690")).toBe(true);
    expect(isValidPtNif("509625691")).toBe(false);
    expect(isValidPtNif("12345")).toBe(false);
  });
  it("valida prazo", () => {
    const base = { seller_legal_name: "", seller_tax_id: "", seller_address: "", delivery_business_days: "" };
    expect(validateSeller({ ...base, delivery_business_days: "3" })).toBeNull();
    expect(validateSeller({ ...base, delivery_business_days: "0" })).not.toBeNull();
  });
});
