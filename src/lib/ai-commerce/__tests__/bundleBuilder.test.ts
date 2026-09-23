import { describe, it, expect } from "vitest";
import {
  buildBundleSuggestions,
  maxSafeDiscountPct,
  MAX_DISCOUNT_WITHOUT_COST_PCT,
} from "../bundleBuilder";

const anchor = {
  id: "a",
  name: "Câmara Bullet 5MP",
  brand: "Ajax",
  category: "Videovigilância",
  base_price: 300,
  unit_cost: 150,
  status: "active",
};

const acc1 = { id: "b", name: "Caixa de junção", base_price: 20, unit_cost: 8, status: "active" };
const acc2 = { id: "c", name: "Suporte", base_price: 30, unit_cost: 12, status: "active" };

const rel = (target: string, type: string, extra: Record<string, unknown> = {}) => ({
  source_product_id: "a",
  target_product_id: target,
  relation_type: type,
  is_active: true,
  validation_status: "approved",
  ...extra,
});

describe("bundleBuilder", () => {
  it("cria sugestão com âncora e complementos aprovados", () => {
    const out = buildBundleSuggestions([anchor, acc1, acc2], [rel("b", "accessory"), rel("c", "accessory")]);
    expect(out).toHaveLength(1);
    expect(out[0].items).toHaveLength(3);
    expect(out[0].list_total).toBe(350);
    expect(out[0].savings).toBeGreaterThan(0);
  });

  it("ignora relações rejeitadas ou inativas", () => {
    const out = buildBundleSuggestions(
      [anchor, acc1, acc2],
      [rel("b", "accessory", { validation_status: "rejected" }), rel("c", "accessory", { is_active: false })]
    );
    expect(out).toHaveLength(0);
  });

  it("ignora produtos esgotados quando o stock é controlado", () => {
    const esgotado = { ...acc2, track_stock: true, stock_quantity: 1, stock_reserved: 1 };
    const out = buildBundleSuggestions([anchor, acc1, esgotado], [rel("b", "accessory"), rel("c", "accessory")]);
    expect(out).toHaveLength(0);
  });

  it("limita o desconto quando não há custos conhecidos", () => {
    expect(maxSafeDiscountPct(1000, null, "solution")).toBe(MAX_DISCOUNT_WITHOUT_COST_PCT);
  });

  it("protege a margem mínima", () => {
    // custo 800 sobre PVP 1000 não permite desconto
    expect(maxSafeDiscountPct(1000, 800, "solution")).toBe(0);
  });
});
