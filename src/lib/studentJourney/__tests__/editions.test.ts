import { describe, it, expect } from "vitest";
import { computeEditionSeats, editionDaysInMonth } from "../editions";

describe("computeEditionSeats", () => {
  it("vagas = capacidade − inscritos que ocupam lugar − reservadas", () => {
    const s = computeEditionSeats(10, 2, ["enrolled", "active", "dropped", "interested", "completed"]);
    expect(s.occupied).toBe(3);
    expect(s.available).toBe(5);
    expect(s.full).toBe(false);
  });
  it("edição esgotada nunca fica com vagas negativas", () => {
    expect(computeEditionSeats(2, 1, ["enrolled", "active"])).toMatchObject({ available: 0, full: true });
  });
  it("sem capacidade definida não há limite", () => {
    expect(computeEditionSeats(null, 0, ["enrolled"]).available).toBeNull();
  });
});

describe("editionDaysInMonth", () => {
  it("corta a edição aos dias do mês pedido", () => {
    expect(editionDaysInMonth("2026-10-30", "2026-11-02", 2026, 11)).toEqual([1, 2]);
    expect(editionDaysInMonth("2026-12-01", null, 2026, 11)).toEqual([]);
  });
});
