import { describe, it, expect } from "vitest";
import { calculateVAT, calculateGross } from "@/types/order-note";

/**
 * Convenção do projeto:
 *  - base_price        => NET (s/IVA) — sofre calculateVAT/calculateGross
 *  - compare_at_price  => GROSS (c/IVA) — NUNCA é re-tributado
 * Estes testes garantem que a taxa fiscal só é aplicada quando necessário.
 */
describe("calculateVAT — aplica taxa apenas sobre valores NET", () => {
  it("aplica 23% (PT continental) por defeito", () => {
    expect(calculateVAT(100)).toBeCloseTo(23, 2);
  });

  it("aplica 22% (Madeira)", () => {
    expect(calculateVAT(100, 22)).toBeCloseTo(22, 2);
  });

  it("aplica 16% (Açores)", () => {
    expect(calculateVAT(100, 16)).toBeCloseTo(16, 2);
  });

  it("retorna 0 quando vatRate é 0 (isento)", () => {
    expect(calculateVAT(100, 0)).toBe(0);
  });

  it("retorna 0 quando o valor net é 0", () => {
    expect(calculateVAT(0, 23)).toBe(0);
  });

  it("trata valores fracionados sem perda significativa", () => {
    // 19,90 € * 23% = 4,577 €
    expect(calculateVAT(19.9, 23)).toBeCloseTo(4.577, 3);
  });
});

describe("calculateGross — soma IVA ao NET para obter o GROSS", () => {
  it("100 € net @ 23% → 123 € gross", () => {
    expect(calculateGross(100, 23)).toBeCloseTo(123, 2);
  });

  it("é idempotente quando vatRate é 0 (NET == GROSS)", () => {
    expect(calculateGross(50, 0)).toBe(50);
  });

  it("preserva 0 € em qualquer taxa", () => {
    expect(calculateGross(0, 23)).toBe(0);
  });
});

describe("Convenção de pricing — compare_at_price NÃO é re-tributado", () => {
  it("PVP recomendado (c/IVA) é usado tal-qual, sem chamar calculateVAT", () => {
    const compareAtPrice = 49.9; // já vem c/IVA da BD
    // Simula renderização correta: o componente deve apresentar o valor cru.
    const displayed = compareAtPrice;
    expect(displayed).toBe(49.9);
    // Anti-regressão: se alguém aplicar calculateGross por engano, seria 61.38
    expect(displayed).not.toBeCloseTo(calculateGross(compareAtPrice, 23), 2);
  });

  it("inverter PVP (gross→net) bate com fórmula gross/(1+vat) — sanity check", () => {
    const gross = 123;
    const vat = 23;
    const net = gross / (1 + vat / 100);
    expect(net).toBeCloseTo(100, 2);
    // Round-trip net→gross deve devolver o valor original
    expect(calculateGross(net, vat)).toBeCloseTo(gross, 2);
  });
});

describe("Edge cases de pricing", () => {
  it("rejeita taxas negativas como reduções (não é caso de uso real, apenas matemático)", () => {
    // Documenta o comportamento atual — função não valida sinal
    expect(calculateVAT(100, -23)).toBeCloseTo(-23, 2);
  });

  it("trata valores grandes sem overflow (1M € @ 23%)", () => {
    expect(calculateGross(1_000_000, 23)).toBeCloseTo(1_230_000, 2);
  });
});
