import { describe, expect, it } from "vitest";
import {
  checkRelationGrounding,
  classifyRelationIntent,
  isRelationAvailable,
  rankRelationOffers,
  shouldAutoApprove,
  type RelationOffer,
  type RelationProductFacts,
} from "../relationIntent";

const base = (overrides: Partial<RelationProductFacts> = {}): RelationProductFacts => ({
  id: "src",
  name: "Central Ajax Hub 2",
  brand: "Ajax",
  category: "Alarmes",
  subcategory: "Centrais",
  productType: "Central",
  price: 200,
  status: "active",
  stockStatus: "available",
  trackStock: false,
  stockQuantity: null,
  storePublished: true,
  context: "central alarme ajax hub sirene",
  ...overrides,
});

describe("classifyRelationIntent", () => {
  it("classifica upgrade mais caro como up-sell", () => {
    expect(classifyRelationIntent("upgrade", 200, 300)).toBe("upsell");
  });

  it("classifica alternativa mais barata como down-sell", () => {
    expect(classifyRelationIntent("alternative", 200, 120)).toBe("downsell");
  });

  it("classifica acessório como cross-sell", () => {
    expect(classifyRelationIntent("accessory", 200, 30)).toBe("cross_sell");
  });
});

describe("isRelationAvailable", () => {
  it("rejeita produto esgotado", () => {
    expect(isRelationAvailable(base({ stockStatus: "out_of_stock" }))).toBe(false);
  });

  it("rejeita produto não publicado quando exigido", () => {
    expect(
      isRelationAvailable(base({ storePublished: false }), { requireStorePublished: true }),
    ).toBe(false);
  });
});

describe("checkRelationGrounding", () => {
  it("aceita upgrade da mesma categoria e mais caro", () => {
    const result = checkRelationGrounding({
      source: base(),
      target: base({ id: "t", name: "Ajax Hub 2 Plus", price: 320 }),
      relationType: "upgrade",
    });
    expect(result.grounded).toBe(true);
  });

  it("rejeita upgrade mais barato", () => {
    const result = checkRelationGrounding({
      source: base(),
      target: base({ id: "t", price: 100 }),
      relationType: "upgrade",
    });
    expect(result.grounded).toBe(false);
  });

  it("rejeita relação sem qualquer evidência real", () => {
    const result = checkRelationGrounding({
      source: base(),
      target: {
        id: "t",
        name: "Cadeira de escritório",
        brand: "Outra",
        category: "Mobiliário",
        subcategory: null,
        productType: null,
        price: 80,
        status: "active",
        stockStatus: "available",
        trackStock: false,
        stockQuantity: null,
        storePublished: true,
        context: "cadeira rodas tecido",
      },
      relationType: "accessory",
    });
    expect(result.grounded).toBe(false);
  });
});

describe("shouldAutoApprove", () => {
  it("só aprova automaticamente com evidência e confiança alta", () => {
    const grounded = { grounded: true, signals: ["mesma marca Ajax"] };
    expect(shouldAutoApprove("high", grounded)).toBe(true);
    expect(shouldAutoApprove("medium", grounded)).toBe(false);
    expect(shouldAutoApprove("high", { grounded: false, signals: [] })).toBe(false);
  });
});

describe("rankRelationOffers", () => {
  const offer = (
    id: string,
    relationType: RelationOffer["relationType"],
    intent: RelationOffer["intent"],
    price: number,
  ): RelationOffer<string> => ({
    relationType,
    intent,
    target: base({ id, price }),
    payload: id,
  });

  it("ordena up-sell por valor decrescente", () => {
    const ranked = rankRelationOffers(
      [
        offer("a", "accessory", "cross_sell", 30),
        offer("b", "upgrade", "upsell", 300),
      ],
      { sourcePrice: 200, sourceAvailable: true },
    );
    expect(ranked.upsell.map((o) => o.payload)).toEqual(["b", "a"]);
  });

  it("dá alternativas quando o produto principal está indisponível", () => {
    const ranked = rankRelationOffers([offer("alt", "alternative", "downsell", 180)], {
      sourcePrice: 200,
      sourceAvailable: false,
    });
    expect(ranked.downsell.map((o) => o.payload)).toEqual(["alt"]);
  });

  it("nunca devolve alternativas esgotadas", () => {
    const ranked = rankRelationOffers(
      [
        {
          relationType: "alternative",
          intent: "downsell",
          target: base({ id: "x", price: 150, stockStatus: "out_of_stock" }),
          payload: "x",
        },
      ],
      { sourcePrice: 200, sourceAvailable: false },
    );
    expect(ranked.downsell).toHaveLength(0);
  });
});
