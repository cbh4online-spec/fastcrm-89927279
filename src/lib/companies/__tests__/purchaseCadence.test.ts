import { describe, it, expect } from "vitest";
import { computePurchaseCadence } from "../purchaseCadence";

const today = new Date("2026-10-29T12:00:00Z");

describe("computePurchaseCadence", () => {
  it("compra a cada 30 dias e 40 dias sem comprar → fora de perfil", () => {
    const r = computePurchaseCadence({ first: "2026-06-21", last: "2026-09-19", purchaseDays: 4, netTotal: 1800, lastValue: 450, today });
    expect(r.avgIntervalDays).toBe(30);
    expect(r.daysSinceLast).toBe(40);
    expect(r.status).toBe("late");
  });
  it("ciclo 30 dias e 35 dias sem comprar → janela de recompra (dentro dos 30%)", () => {
    const r = computePurchaseCadence({ first: "2026-06-26", last: "2026-09-24", purchaseDays: 4, netTotal: 1800, lastValue: 450, today });
    expect(r.status).toBe("due");
  });
  it("última compra abaixo de metade do ticket médio → queda de valor", () => {
    const r = computePurchaseCadence({ first: "2026-08-01", last: "2026-10-20", purchaseDays: 4, netTotal: 1600, lastValue: 100, today });
    expect(r.valueDrop).toBe(true);
  });
  it("uma só compra não tem ciclo", () => {
    const r = computePurchaseCadence({ first: "2026-10-01", last: "2026-10-01", purchaseDays: 1, netTotal: 100, lastValue: 100, today });
    expect(r.status).toBe("single");
  });
});
