import { describe, expect, it } from "vitest";
import { evaluateReadiness, readinessBand } from "@/lib/ai-commerce/readiness";
import { buildFeed } from "@/lib/ai-commerce/feeds";
import type { CommerceProduct, ProductAICommerce } from "@/lib/ai-commerce/types";

const product: CommerceProduct = {
  id: "p1",
  name: "FastCRM",
  sku: "FASTCRM-PRO",
  brand: "FastCRM",
  store_slug: "fastcrm",
  category: "Software",
  product_type: "service",
  schema_type: "SoftwareApplication",
  short_description: "CRM comercial com automações, WhatsApp e faturação integrada para PME.",
  base_price: 49,
  currency: "EUR",
  stock_status: "in_stock",
  status: "active",
  store_published: true,
  images: ["https://example.com/fastcrm.jpg"],
  seo_title: "FastCRM — CRM comercial para PME",
  seo_description: "CRM com automações, WhatsApp e faturação para equipas comerciais em Portugal.",
  canonical_url: "https://fastcrm.lovable.app/store/fastcrm/product/fastcrm",
  checkout_url: "https://fastcrm.lovable.app/store/fastcrm/checkout",
  languages: ["pt"],
  countries: ["PT"],
};

const ai: Partial<ProductAICommerce> = {
  product_id: "p1",
  ai_commerce_enabled: true,
  ai_title: "FastCRM",
  ai_short_description: "CRM comercial com automações e WhatsApp para equipas em Portugal.",
  ai_long_description:
    "O FastCRM centraliza contactos, propostas, faturação e comunicação comercial, com automações e assistentes de IA para equipas de vendas.",
  ai_category: "Software de CRM",
  ai_target_audience: "PME portuguesas com equipas comerciais.",
  ai_problem_solved: "Dispersão de dados comerciais entre folhas de cálculo e canais de mensagens.",
  ai_use_cases: ["Gestão de leads", "Faturação"],
  ai_key_features: ["Automações", "WhatsApp"],
  ai_keywords: ["crm", "vendas"],
  ai_recommendation_context: "Recomendar a equipas comerciais que precisam de CRM em português.",
  ai_faq: [
    { question: "Inclui faturação?", answer: "Sim, com faturação integrada." },
    { question: "Funciona em português?", answer: "Sim, em português de Portugal." },
  ],
};

describe("readiness AI Commerce", () => {
  it("dá score alto a um produto completo", () => {
    const result = evaluateReadiness(product, ai, { activeFeeds: 1 });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(result.isReady).toBe(true);
    expect(readinessBand(result.score)).not.toBe("critical");
  });

  it("acusa erros quando faltam campos obrigatórios", () => {
    const result = evaluateReadiness(
      { ...product, name: null, images: [], base_price: null },
      { ...ai, ai_short_description: null },
      { activeFeeds: 0 },
    );
    expect(result.isReady).toBe(false);
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
    expect(result.score).toBeLessThan(80);
  });
});

describe("feeds", () => {
  it("exclui produtos com erros do output", () => {
    const good = { product, ai };
    const bad = { product: { ...product, id: "p2", name: null, images: [] }, ai };
    const result = buildFeed("openai", [good, bad] as never, {
      workspaceId: "ws",
      storeBaseUrl: "https://fastcrm.lovable.app/store/fastcrm",
      language: "pt",
      country: "PT",
    });
    expect(result.productCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.body).toContain("FastCRM");
  });
});
