/**
 * Testes do endurecimento AI Commerce: variantes, score configurável,
 * commerce ready, resumo de feeds e política de tracking do cliente.
 */
import { describe, expect, it } from "vitest";
import {
  COMMERCE_READY_CODES,
  effectivePrice,
  evaluateReadiness,
  priceRange,
} from "@/lib/ai-commerce/readiness";
import { buildFeed, summarizeIssues } from "@/lib/ai-commerce/feeds";
import type { CommerceProduct, ProductAICommerce } from "@/lib/ai-commerce/types";

const base: CommerceProduct = {
  id: "p1",
  name: "myMIA",
  sku: "MYMIA-BASE",
  brand: "myMIA",
  store_slug: "mymia",
  category: "Software",
  product_type: "service",
  schema_type: "SoftwareApplication",
  short_description: "Assistente comercial com IA para equipas que vendem todos os dias.",
  base_price: null,
  currency: "EUR",
  stock_status: "in_stock",
  status: "active",
  store_published: true,
  images: ["https://example.com/mymia.jpg"],
  canonical_url: "https://fastcrm.lovable.app/store/mymia/product/mymia",
  checkout_url: "https://fastcrm.lovable.app/store/mymia/checkout",
  languages: ["pt"],
  countries: ["PT"],
  main_benefits: ["Responde mais depressa", "Mantém histórico completo"],
};

const ai: Partial<ProductAICommerce> = { product_id: "p1", ai_commerce_enabled: true };

describe("preço com variantes", () => {
  it("usa o menor preço de variante ativa quando o produto não tem preço base", () => {
    const product: CommerceProduct = {
      ...base,
      variants: [
        { id: "v1", name: "Mensal", sku: null, price_override: 39, is_active: true },
        { id: "v2", name: "Anual", sku: null, price_override: 390, is_active: true },
        { id: "v3", name: "Antigo", sku: null, price_override: 9, is_active: false },
      ],
    };
    expect(effectivePrice(product)).toBe(39);
    expect(priceRange(product)).toEqual({ min: 39, max: 390 });
  });

  it("considera o critério de preço cumprido quando existe variante com preço", () => {
    const withoutVariants = evaluateReadiness(base, ai, {});
    expect(withoutVariants.issues.some((i) => i.code === "price")).toBe(true);

    const withVariants = evaluateReadiness(
      { ...base, variants: [{ id: "v1", name: "Mensal", sku: null, price_override: 39, is_active: true }] },
      ai,
      {},
    );
    expect(withVariants.issues.some((i) => i.code === "price")).toBe(false);
    expect(withVariants.passed).toContain("price");
  });
});

describe("score configurável", () => {
  it("respeita a desativação de um critério por workspace", () => {
    const withCriterion = evaluateReadiness(base, ai, {});
    const withoutCriterion = evaluateReadiness(base, ai, {
      overrides: [{ code: "price", enabled: false }],
    });
    expect(withoutCriterion.issues.some((i) => i.code === "price")).toBe(false);
    expect(withoutCriterion.score).toBeGreaterThan(withCriterion.score);
  });

  it("respeita pesos e severidade personalizados", () => {
    const result = evaluateReadiness(base, ai, {
      overrides: [{ code: "price", weight: 0, severity: "warning" }],
    });
    const issue = result.issues.find((i) => i.code === "price");
    expect(issue?.severity).toBe("warning");
  });

  it("devolve score por categoria", () => {
    const result = evaluateReadiness(base, ai, {});
    const codes = result.categories.map((c) => c.category);
    expect(codes).toContain("commercial");
    expect(result.categories.every((c) => c.score >= 0 && c.score <= 100)).toBe(true);
  });
});

describe("commerce ready", () => {
  it("não marca como pronto para venda sem preço", () => {
    expect(evaluateReadiness(base, ai, {}).isCommerceReady).toBe(false);
  });

  it("marca como pronto quando preço, moeda, disponibilidade e checkout existem", () => {
    const result = evaluateReadiness({ ...base, base_price: 49 }, ai, {});
    expect(result.isCommerceReady).toBe(true);
    for (const code of COMMERCE_READY_CODES) {
      expect(result.passed).toContain(code);
    }
  });
});

describe("feeds", () => {
  it("conta produtos rejeitados e resume os erros", () => {
    const good = { product: { ...base, base_price: 49 }, ai };
    const bad = { product: { ...base, id: "p2", name: null, images: [] }, ai };
    const result = buildFeed("openai", [good, bad] as never, {
      baseUrl: "https://fastcrm.lovable.app",
      workspaceSlug: "mymia",
      language: "pt",
      country: "PT",
    });
    expect(result.inputCount).toBe(2);
    expect(result.rejectedCount).toBe(1);
    expect(result.productCount).toBe(1);
    expect(result.summary).not.toBe("");
  });

  it("inclui as variantes no feed OpenAI", () => {
    const product = {
      ...base,
      base_price: 49,
      variants: [{ id: "v1", name: "Anual", sku: "MYMIA-ANUAL", price_override: 390, is_active: true }],
    };
    const result = buildFeed("openai", [{ product, ai }] as never, {
      baseUrl: "https://fastcrm.lovable.app",
      workspaceSlug: "mymia",
    });
    expect(result.body).toContain("MYMIA-ANUAL");
    expect(result.body).toContain("price_max");
  });

  it("agrupa erros iguais num resumo legível", () => {
    const summary = summarizeIssues([
      { product_id: "a", message: "Preço obrigatório" },
      { product_id: "b", message: "Preço obrigatório" },
      { product_id: "c", message: "Imagem obrigatória" },
    ]);
    expect(summary).toContain("2 produtos: Preço obrigatório");
    expect(summary).toContain("1 produto: Imagem obrigatória");
  });
});
