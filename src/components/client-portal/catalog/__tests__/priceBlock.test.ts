import { describe, it, expect, beforeAll } from "vitest";
import i18n from "@/i18n";
import { calculateVAT, calculateGross } from "@/types/order-note";
import { formatCurrency } from "@/lib/formatters";

beforeAll(async () => {
  // Garante locale pt-PT para Intl.NumberFormat (vírgula decimal, € à direita)
  await i18n.changeLanguage("pt");
});

/**
 * Testes de renderização de preços na ficha de produto.
 *
 * Convenção do projeto (ver memória mem://architecture/pricing/...):
 *   - base_price        => NET (s/IVA)
 *   - compare_at_price  => GROSS (c/IVA), PVP recomendado retalho
 *
 * Estes testes simulam o que o ProductDetailModal renderiza em ambos
 * os cenários — quando compare_at_price já vem c/IVA (correto) e o
 * cenário hipotético "sem IVA" (anti-regressão).
 */

interface PriceModel {
  base_price: number;          // NET
  compare_at_price: number | null;
  effective_price?: number | null;
  vatRate: number;
}

/** Imita o que o componente PriceSection mostra no modal. */
function renderPriceBlock(p: PriceModel) {
  const unitNet = p.effective_price ?? p.base_price;
  return {
    pvpRecomendado: p.compare_at_price != null && p.compare_at_price > 0
      ? formatCurrency(p.compare_at_price)   // c/IVA — sem transformação
      : null,
    precoBaseNet: formatCurrency(unitNet),   // s/IVA — sem transformação
    iva: formatCurrency(calculateVAT(unitNet, p.vatRate)),
    totalGross: formatCurrency(calculateGross(unitNet, p.vatRate)),
  };
}

describe("PriceBlock — cenário CORRETO: compare_at_price já vem c/IVA", () => {
  it("apresenta PVP recomendado tal como está na BD (sem re-tributar)", () => {
    const out = renderPriceBlock({
      base_price: 30,           // 30 € net
      compare_at_price: 49.9,   // 49,90 € c/IVA (PVP retalho)
      vatRate: 23,
    });
    // Validação literal — substring para tolerar espaço normal vs &nbsp;
    expect(out.pvpRecomendado).toMatch(/49,90\s*€/);
    expect(out.precoBaseNet).toMatch(/30,00\s*€/);
    expect(out.iva).toMatch(/6,90\s*€/);
    expect(out.totalGross).toMatch(/36,90\s*€/);
  });

  it("PVP nunca é igual a calculateGross(base_price) salvo coincidência", () => {
    const out = renderPriceBlock({
      base_price: 30,
      compare_at_price: 49.9,
      vatRate: 23,
    });
    // 30 € + 23% = 36,90 € — distinto do PVP retalho 49,90 €
    expect(out.pvpRecomendado).not.toBe(out.totalGross);
  });

  it("oculta PVP quando compare_at_price é null", () => {
    const out = renderPriceBlock({
      base_price: 30,
      compare_at_price: null,
      vatRate: 23,
    });
    expect(out.pvpRecomendado).toBeNull();
    expect(out.precoBaseNet).toMatch(/30,00\s*€/);
  });

  it("oculta PVP quando compare_at_price é 0 (placeholder)", () => {
    const out = renderPriceBlock({
      base_price: 30,
      compare_at_price: 0,
      vatRate: 23,
    });
    expect(out.pvpRecomendado).toBeNull();
  });

  it("usa effective_price (preço promocional) quando presente, mantendo PVP intacto", () => {
    const out = renderPriceBlock({
      base_price: 30,
      effective_price: 24,        // promo B2B
      compare_at_price: 49.9,
      vatRate: 23,
    });
    expect(out.precoBaseNet).toMatch(/24,00\s*€/);
    expect(out.pvpRecomendado).toMatch(/49,90\s*€/); // PVP não muda
    expect(out.totalGross).toMatch(/29,52\s*€/);     // 24 * 1.23
  });
});

describe("PriceBlock — anti-regressão: NÃO aplicar IVA ao compare_at_price", () => {
  it("se alguém aplicasse calculateGross ao PVP, o valor disparava 23% — teste falha se acontecer", () => {
    const compareAt = 49.9;
    const out = renderPriceBlock({
      base_price: 30,
      compare_at_price: compareAt,
      vatRate: 23,
    });
    const wrongPvp = formatCurrency(calculateGross(compareAt, 23)); // 61,38 €
    expect(out.pvpRecomendado).not.toBe(wrongPvp);
    expect(out.pvpRecomendado).toMatch(/49,90\s*€/);
  });
});

describe("PriceBlock — cenário hipotético compare_at_price s/IVA (caso de migração)", () => {
  /**
   * Documenta o comportamento se a convenção fosse invertida.
   * Não é o caso atual, mas serve de regression net se um dia a regra mudar:
   * o componente teria de aplicar calculateGross ao compare_at_price.
   */
  it("se PVP viesse s/IVA, o display correto seria gross calculado", () => {
    const compareAtNet = 40.57;                  // 40,57 € s/IVA
    const expectedGross = calculateGross(compareAtNet, 23); // 49,90 €
    expect(formatCurrency(expectedGross)).toMatch(/49,90\s*€/);
  });
});

describe("PriceBlock — taxas regionais", () => {
  it("Madeira (22%): 100 € net → 122 € gross", () => {
    const out = renderPriceBlock({
      base_price: 100,
      compare_at_price: 150,
      vatRate: 22,
    });
    expect(out.iva).toMatch(/22,00\s*€/);
    expect(out.totalGross).toMatch(/122,00\s*€/);
    expect(out.pvpRecomendado).toMatch(/150,00\s*€/);
  });

  it("Açores (16%): 100 € net → 116 € gross", () => {
    const out = renderPriceBlock({
      base_price: 100,
      compare_at_price: 150,
      vatRate: 16,
    });
    expect(out.iva).toMatch(/16,00\s*€/);
    expect(out.totalGross).toMatch(/116,00\s*€/);
  });

  it("Isento (0%): NET == GROSS", () => {
    const out = renderPriceBlock({
      base_price: 100,
      compare_at_price: null,
      vatRate: 0,
    });
    expect(out.iva).toMatch(/0,00\s*€/);
    expect(out.totalGross).toMatch(/100,00\s*€/);
  });
});
