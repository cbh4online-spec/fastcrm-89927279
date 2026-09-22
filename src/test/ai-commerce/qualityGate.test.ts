/**
 * Gate de qualidade: bloqueio fail-closed, respeito pelos critérios do workspace
 * e correções em massa sem inventar dados.
 */
import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "@/lib/ai-commerce/readiness";
import {
  DEFAULT_QUALITY_GATE_CONFIG,
  evaluateQualityGate,
  gateBlockerSummary,
  groupBlockers,
  normalizeGateConfig,
} from "@/lib/ai-commerce/qualityGate";
import { buildGateFixPlan, DEFAULT_GATE_FIX_DEFAULTS } from "@/lib/ai-commerce/gateFixes";
import type { CommerceProduct, ProductAICommerce } from "@/lib/ai-commerce/types";

const complete: CommerceProduct = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Câmara IP Bullet 5 MP",
  sku: "AJ-BULLETCAM-5",
  brand: "Ajax",
  store_slug: "camara-ip-bullet-5",
  category: "Videovigilância",
  product_type: "physical",
  schema_type: "Product",
  short_description: "Câmara IP exterior com lente varifocal motorizada e visão noturna até 35 metros.",
  base_price: 366.91,
  currency: "EUR",
  stock_status: "in_stock",
  status: "active",
  store_published: true,
  images: ["https://example.com/cam.jpg"],
  canonical_url: "https://fastcrm.metodopare.ai/store/ajax/product/camara-ip-bullet-5",
  checkout_url: "https://fastcrm.metodopare.ai/store/ajax/checkout",
  languages: ["pt"],
  countries: ["PT"],
  main_benefits: ["Imagem nítida de noite", "Instalação exterior"],
};

const ai: Partial<ProductAICommerce> = { product_id: complete.id, ai_commerce_enabled: true };

describe("gate de qualidade", () => {
  it("aprova um produto completo", () => {
    const gate = evaluateQualityGate(evaluateReadiness(complete, ai, {}), DEFAULT_QUALITY_GATE_CONFIG);
    expect(gate.status).toBe("pass");
    expect(gate.blockedFromStore).toBe(false);
    expect(gate.blockedFromFeeds).toBe(false);
  });

  it("bloqueia na loja e nos feeds quando falta um campo obrigatório", () => {
    const gate = evaluateQualityGate(
      evaluateReadiness({ ...complete, images: [] }, ai, {}),
      DEFAULT_QUALITY_GATE_CONFIG,
    );
    expect(gate.status).toBe("blocked");
    expect(gate.blockedFromStore).toBe(true);
    expect(gate.blockedFromFeeds).toBe(true);
    expect(gate.blockers.length).toBeGreaterThan(0);
  });

  it("bloqueia por readiness abaixo do mínimo", () => {
    const readiness = evaluateReadiness(complete, ai, {});
    const gate = evaluateQualityGate(readiness, { ...DEFAULT_QUALITY_GATE_CONFIG, requiredCodes: [], minScore: 100 });
    expect(gate.status).toBe("blocked");
    expect(gate.blockers.some((b) => b.kind === "below_score")).toBe(true);
  });

  it("não bloqueia quando o gate está desativado", () => {
    const gate = evaluateQualityGate(evaluateReadiness({ ...complete, images: [] }, ai, {}), {
      ...DEFAULT_QUALITY_GATE_CONFIG,
      enabled: false,
    });
    expect(gate.status).toBe("pass");
  });

  it("ignora critérios desativados nos Critérios do workspace", () => {
    const readiness = evaluateReadiness({ ...complete, brand: null }, ai, {
      overrides: [{ code: "brand", enabled: false }],
    });
    const gate = evaluateQualityGate(readiness, DEFAULT_QUALITY_GATE_CONFIG);
    expect(gate.missingRequired).not.toContain("brand");
  });

  it("normaliza a configuração com limites seguros", () => {
    const cfg = normalizeGateConfig({ minScore: 180, requiredCodes: ["price", "price", " "] });
    expect(cfg.minScore).toBe(100);
    expect(cfg.requiredCodes).toEqual(["price"]);
    expect(cfg.enabled).toBe(true);
  });

  it("resume e agrupa os motivos de bloqueio", () => {
    const gate = evaluateQualityGate(
      evaluateReadiness({ ...complete, images: [], brand: null }, ai, {}),
      DEFAULT_QUALITY_GATE_CONFIG,
    );
    expect(gateBlockerSummary(gate.blockers)).not.toBe("");
    const grouped = groupBlockers([
      { productId: "a", blockers: gate.blockers },
      { productId: "b", blockers: gate.blockers },
    ]);
    expect(grouped[0].productIds).toHaveLength(2);
  });
});

describe("correções em massa", () => {
  it("nunca toca em preço, stock nem identificadores", () => {
    const plan = buildGateFixPlan(
      { ...complete, currency: null, store_slug: null, schema_type: null, languages: [], countries: [] },
      ai,
      ["currency", "store_slug", "schema_type", "language_country"],
      DEFAULT_GATE_FIX_DEFAULTS,
    );
    expect(plan).not.toBeNull();
    const keys = Object.keys(plan!.productPatch);
    expect(keys).not.toContain("base_price");
    expect(keys).not.toContain("stock_quantity");
    expect(keys).not.toContain("gtin");
    expect(plan!.productPatch.currency).toBe("EUR");
    expect(String(plan!.productPatch.store_slug)).toContain("camara");
  });

  it("devolve null quando não há nada seguro para aplicar", () => {
    expect(buildGateFixPlan(complete, ai, ["currency", "schema_type"], DEFAULT_GATE_FIX_DEFAULTS)).toBeNull();
  });

  it("copia a descrição curta existente para o AI Commerce", () => {
    const plan = buildGateFixPlan(complete, ai, ["short_description"], DEFAULT_GATE_FIX_DEFAULTS);
    expect(plan?.aiPatch.ai_short_description).toBe(complete.short_description);
  });
});
