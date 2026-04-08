import { describe, it, expect } from "vitest";
import { MENU_KEYS, type MenuKey } from "@/hooks/useMenuPermissions";

describe("MENU_KEYS", () => {
  it("all keys are lowercase strings", () => {
    for (const [enumKey, value] of Object.entries(MENU_KEYS)) {
      expect(typeof value).toBe("string");
      expect(value).toBe(value.toLowerCase());
    }
  });

  it("has no duplicate values", () => {
    const values = Object.values(MENU_KEYS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("contains essential CRM keys", () => {
    const keys = Object.values(MENU_KEYS);
    expect(keys).toContain("dashboard");
    expect(keys).toContain("leads");
    expect(keys).toContain("contacts");
    expect(keys).toContain("pipeline");
    expect(keys).toContain("settings");
  });
});
