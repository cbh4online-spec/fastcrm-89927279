import { describe, it, expect } from "vitest";
import { availableToSell, evaluateLineStock, aggregateQuantities } from "./cartStock";

describe("cartStock", () => {
  it("sem track_stock não limita", () => {
    expect(availableToSell({ track_stock: false, stock_quantity: 0 })).toBeNull();
    expect(evaluateLineStock({ track_stock: false, stock_quantity: 0 }, 50).ok).toBe(true);
  });
  it("desconta reservas", () => {
    expect(availableToSell({ track_stock: true, stock_quantity: 5, stock_reserved: 2 })).toBe(3);
    expect(evaluateLineStock({ track_stock: true, stock_quantity: 5, stock_reserved: 2 }, 4)).toEqual({
      ok: false, reason: "insufficient_stock", available: 3,
    });
    expect(evaluateLineStock({ track_stock: true, stock_quantity: 5, stock_reserved: 2 }, 3).ok).toBe(true);
  });
  it("tudo reservado = esgotado", () => {
    expect(evaluateLineStock({ track_stock: true, stock_quantity: 2, stock_reserved: 2 }, 1)).toEqual({
      ok: false, reason: "out_of_stock", available: 0,
    });
  });
  it("stock_status esgotado bloqueia sempre", () => {
    expect(evaluateLineStock({ track_stock: false, stock_status: "out_of_stock" }, 1).ok).toBe(false);
  });
  it("soma linhas repetidas", () => {
    expect(aggregateQuantities([{ productId: "a", quantity: 2 }, { productId: "a", quantity: 3 }]).get("a")).toBe(5);
  });
});
