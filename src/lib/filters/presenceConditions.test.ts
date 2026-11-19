import { describe, it, expect } from "vitest";
import { matchesPresence, normalizePresenceSelection, hasValue } from "./presenceConditions";

describe("condições de presença", () => {
  const rec = { email: "a@b.pt", phone: "  ", company: null };
  const get = (f: string) => (rec as Record<string, unknown>)[f];

  it("com email e sem telefone combinam (AND)", () => {
    expect(matchesPresence(["email:has", "phone:missing"], get)).toBe(true);
    expect(matchesPresence(["email:missing"], get)).toBe(false);
  });
  it("espaços e traço contam como sem dados", () => {
    expect(hasValue("  ")).toBe(false);
    expect(hasValue("—")).toBe(false);
  });
  it("com e sem do mesmo campo são exclusivos", () => {
    expect(normalizePresenceSelection(["email:has"], ["email:has", "email:missing"])).toEqual(["email:missing"]);
  });
});
