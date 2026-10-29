import { describe, it, expect } from "vitest";
import { monthRange, periodLabel } from "../monthRange";
describe("monthRange", () => {
  it("setembro 2025", () => expect(monthRange(2025, 9)).toEqual({ from: "2025-09-01", to: "2025-09-30" }));
  it("fevereiro bissexto", () => expect(monthRange(2024, 2).to).toBe("2024-02-29"));
  it("fevereiro normal", () => expect(monthRange(2025, 2).to).toBe("2025-02-28"));
  it("dezembro", () => expect(monthRange(2026, 12)).toEqual({ from: "2026-12-01", to: "2026-12-31" }));
  it("rótulo mês", () => expect(periodLabel("2025-09-01", "2025-09-30")).toBe("Setembro 2025"));
});
