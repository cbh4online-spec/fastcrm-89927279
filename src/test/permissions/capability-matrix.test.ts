import { describe, it, expect } from "vitest";
import {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  roleHasCapability,
} from "@/lib/permissions/capabilities";

describe("capability matrix (SSoT)", () => {
  it("owner has all capabilities", () => {
    for (const cap of CAPABILITIES) {
      expect(roleHasCapability("owner", cap)).toBe(true);
    }
  });

  it("admin has everything except workspace.billing", () => {
    expect(roleHasCapability("admin", "workspace.billing")).toBe(false);
    expect(roleHasCapability("admin", "workspace.manage")).toBe(true);
    expect(roleHasCapability("admin", "members.manage")).toBe(true);
    expect(roleHasCapability("admin", "finance.manage")).toBe(true);
  });

  it("agent has CRM/inbox/catalog read+write but no finance/admin", () => {
    expect(roleHasCapability("agent", "crm.write")).toBe(true);
    expect(roleHasCapability("agent", "inbox.reply")).toBe(true);
    expect(roleHasCapability("agent", "catalog.read")).toBe(true);
    expect(roleHasCapability("agent", "finance.view")).toBe(false);
    expect(roleHasCapability("agent", "finance.manage")).toBe(false);
    expect(roleHasCapability("agent", "hr.access")).toBe(false);
    expect(roleHasCapability("agent", "security.access")).toBe(false);
    expect(roleHasCapability("agent", "workspace.manage")).toBe(false);
    expect(roleHasCapability("agent", "integrations.manage")).toBe(false);
  });

  it("viewer is read-only", () => {
    expect(roleHasCapability("viewer", "crm.read")).toBe(true);
    expect(roleHasCapability("viewer", "crm.write")).toBe(false);
    expect(roleHasCapability("viewer", "crm.delete")).toBe(false);
    expect(roleHasCapability("viewer", "inbox.read")).toBe(true);
    expect(roleHasCapability("viewer", "inbox.reply")).toBe(false);
    expect(roleHasCapability("viewer", "finance.view")).toBe(true);
    expect(roleHasCapability("viewer", "finance.manage")).toBe(false);
    expect(roleHasCapability("viewer", "hr.access")).toBe(false);
    expect(roleHasCapability("viewer", "security.access")).toBe(false);
  });

  it("hr inherits agent + hr.access", () => {
    expect(roleHasCapability("hr", "hr.access")).toBe(true);
    expect(roleHasCapability("hr", "crm.write")).toBe(true);
    expect(roleHasCapability("hr", "finance.manage")).toBe(false);
    expect(roleHasCapability("hr", "security.access")).toBe(false);
  });

  it("agency mirrors admin", () => {
    for (const cap of CAPABILITIES) {
      expect(roleHasCapability("agency", cap)).toBe(
        roleHasCapability("admin", cap),
      );
    }
  });

  it("null role denies everything", () => {
    for (const cap of CAPABILITIES) {
      expect(roleHasCapability(null, cap)).toBe(false);
      expect(roleHasCapability(undefined, cap)).toBe(false);
    }
  });

  it("every role has at least one capability", () => {
    for (const role of Object.keys(ROLE_CAPABILITIES)) {
      const caps =
        ROLE_CAPABILITIES[role as keyof typeof ROLE_CAPABILITIES];
      expect(caps.length).toBeGreaterThan(0);
    }
  });
});
