import { describe, it, expect } from "vitest";
import { isEmptyHousingSku, housingBaseSku } from "./emptyHousing";

describe("emptyHousing", () => {
  it("deteta SKU -DUMMY", () => {
    expect(isEmptyHousingSku("AJ-KEYPADCOMBI-W-DUMMY")).toBe(true);
    expect(isEmptyHousingSku("AJ-FIREPROTECT-W-DUMMY-COPY")).toBe(true);
    expect(isEmptyHousingSku("AJ-KEYPADCOMBI-W")).toBe(false);
    expect(isEmptyHousingSku(null)).toBe(false);
  });
  it("devolve a referência do equipamento", () => {
    expect(housingBaseSku("AJ-KEYPADCOMBI-W-DUMMY")).toBe("AJ-KEYPADCOMBI-W");
  });
});
