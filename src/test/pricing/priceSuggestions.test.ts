import { describe, it, expect } from "vitest";
import {
  buildPriceSuggestion,
  isSuggestionShowable,
  liveCompetitorRefs,
} from "@/lib/pricing/priceSuggestions";

const now = new Date("2026-09-16T18:00:00Z");
const future = "2026-09-17T18:00:00Z";
const past = "2026-09-15T18:00:00Z";

const product = {
  id: "p1",
  base_price: 500,
  direct_cost: 200,
  operational_cost: 20,
  tax_included: true,
  tax_rate_estimate_pct: 23,
};

describe("liveCompetitorRefs", () => {
  it("ignora referências expiradas e preços inválidos", () => {
    const refs = liveCompetitorRefs(
      [
        { price: 600, expires_at: future },
        { price: 550, expires_at: past },
        { price: 0, expires_at: future },
      ],
      now,
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].price).toBe(600);
  });
});

describe("buildPriceSuggestion", () => {
  it("gera sugestão 1% abaixo da referência mais baixa viva", () => {
    const { draft, refsCount } = buildPriceSuggestion(
      { ...product, base_price: 700 },
      [
        { price: 520, source_name: "worten.pt", expires_at: future },
        { price: 600, source_name: "aquario.pt", expires_at: future },
      ],
      { undercutPct: 1, minMarginPct: 10, maxDropPct: 40, now },
    );
    expect(refsCount).toBe(2);
    expect(draft?.suggested_price).toBe(514.8);
    expect(draft?.source_name).toBe("worten.pt");
    expect(draft?.status).toBe("pending");
    expect(draft?.limited_by_margin).toBe(false);
  });

  it("não gera sugestão sem referências vivas", () => {
    const { draft, reason } = buildPriceSuggestion(
      product,
      [{ price: 520, source_name: "worten.pt", expires_at: past }],
      { now },
    );
    expect(draft).toBeNull();
    expect(reason).toBe("no_valid_reference");
  });

  it("não gera sugestão sem custo conhecido", () => {
    const { draft, reason } = buildPriceSuggestion(
      { ...product, direct_cost: null, operational_cost: null },
      [{ price: 520, expires_at: future }],
      { now },
    );
    expect(draft).toBeNull();
    expect(reason).toBe("no_cost");
  });

  it("marca sugestões limitadas pela margem mínima", () => {
    const { draft } = buildPriceSuggestion(
      { ...product, base_price: 500, direct_cost: 380, operational_cost: 0 },
      [{ price: 490, source_name: "worten.pt", expires_at: future }],
      { undercutPct: 20, minMarginPct: 10, maxDropPct: 50, now },
    );
    expect(draft?.limited_by_margin).toBe(true);
    expect(draft?.optimization_type).toBe("margin_protection");
  });

  it("ignora produtos excluídos do ajuste automático", () => {
    const { draft, reason } = buildPriceSuggestion(
      { ...product, auto_price_excluded: true },
      [{ price: 520, expires_at: future }],
      { now },
    );
    expect(draft).toBeNull();
    expect(reason).toBe("excluded");
  });
});

describe("isSuggestionShowable", () => {
  const suggestion = {
    status: "pending",
    expires_at: future,
    original_price: 500,
    suggested_price: 480,
  };

  it("aceita sugestão fresca e coerente com o preço atual", () => {
    expect(isSuggestionShowable(suggestion, 500, now)).toBe(true);
  });

  it("rejeita sugestão expirada", () => {
    expect(isSuggestionShowable({ ...suggestion, expires_at: past }, 500, now)).toBe(false);
  });

  it("rejeita sugestão cujo preço de partida já mudou", () => {
    expect(isSuggestionShowable(suggestion, 470, now)).toBe(false);
  });

  it("rejeita sugestões já aplicadas ou descartadas", () => {
    expect(isSuggestionShowable({ ...suggestion, status: "dismissed" }, 500, now)).toBe(false);
  });
});
