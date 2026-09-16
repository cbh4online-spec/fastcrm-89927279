import { describe, expect, it } from "vitest";
import {
  buildStorefrontProductSearchFilter,
  getMatchingProductReference,
  normalizeStorefrontSearchTerm,
} from "@/lib/store/productSearch";

describe("pesquisa de referências na loja", () => {
  it("normaliza espaços e remove operadores da consulta", () => {
    expect(normalizeStorefrontSearchTerm("  AJ-HOOD,(%)  ")).toBe("AJ-HOOD");
  });

  it("inclui SKU, código de barras, código SAF-T e variantes no filtro", () => {
    const filter = buildStorefrontProductSearchFilter("AJ-HOOD", ["11111111-1111-4111-8111-111111111111"]);

    expect(filter).toContain("sku.ilike.%AJ-HOOD%");
    expect(filter).toContain("barcode.ilike.%AJ-HOOD%");
    expect(filter).toContain("saft_product_code.ilike.%AJ-HOOD%");
    expect(filter).toContain("id.in.(11111111-1111-4111-8111-111111111111)");
  });

  it("identifica a referência correspondente sem distinguir maiúsculas", () => {
    expect(getMatchingProductReference({ sku: "AJ-HOOD" }, "aj-hood")).toBe("AJ-HOOD");
    expect(getMatchingProductReference({ barcode: "4823114083518" }, "4083518")).toBe("4823114083518");
    expect(getMatchingProductReference({ saft_product_code: "ART-100" }, "art-100")).toBe("ART-100");
    expect(getMatchingProductReference({}, "variant-red", "VARIANT-RED-L")).toBe("VARIANT-RED-L");
  });
});