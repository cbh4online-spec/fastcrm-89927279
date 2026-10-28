import { describe, it, expect } from "vitest";
import { findSensitiveKeys } from "../safeRead";
import { daysUntilLisbon } from "../tools/list-my-open-tasks";

describe("leitura segura MCP", () => {
  it("deteta custos e contactos em saídas aninhadas", () => {
    expect(findSensitiveKeys({ products: [{ name: "x", direct_cost: 1 }], c: { email: "a" } }).sort())
      .toEqual(["direct_cost", "email"]);
  });
  it("saída do catálogo não tem campos sensíveis", () => {
    expect(findSensitiveKeys({ products: [{ id: "1", name: "n", sku: "s", public_price: 1, currency: "EUR", availability: null, slug: null }] })).toEqual([]);
  });
  it("prazo amanhã em Lisboa = 1 mesmo a menos de 24h", () => {
    expect(daysUntilLisbon("2026-10-29T08:00:00Z", new Date("2026-10-28T22:30:00Z"))).toBe(1);
  });
});
