import { describe, it, expect } from "vitest";
import { isInCurrentMonth } from "../currentMonth";
const now = new Date("2026-10-29T12:00:00Z");
describe("isInCurrentMonth", () => {
  it("outubro 2026", () => expect(isInCurrentMonth("2026-10-01", now)).toBe(true));
  it("setembro não", () => expect(isInCurrentMonth("2026-09-30", now)).toBe(false));
  it("outro ano não", () => expect(isInCurrentMonth("2025-10-15", now)).toBe(false));
  it("vazio", () => expect(isInCurrentMonth(null, now)).toBe(false));
  it("31/10 23:30 UTC já é novembro em Lisboa? não (UTC+0)", () =>
    expect(isInCurrentMonth("2026-10-31", new Date("2026-10-31T23:30:00Z"))).toBe(true));
});
