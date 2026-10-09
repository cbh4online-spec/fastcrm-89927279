import { describe, expect, it } from "vitest";
import { ROUTE_MANIFEST, TOP_LEVEL_GROUPS, buildTopLevelSections, getTopLevelGroupForRoute, isNavigationRouteActive } from "@/config/routeManifest";
import { IX_NAV_SECTIONS } from "@/config/navigation/ixNavigation";
import { resolveRouteVisibility } from "@/config/menuOverrides";

const modules = ["prospecting-pro", "google-local-services", "lead-enricher", "instagram-looter"];

describe("Navegação de Prospeção", () => {
  it("places the section between Clients and Sales with each existing destination once", () => {
    const sections = buildTopLevelSections(modules, () => true);
    const keys = sections.map((section) => section.key);
    expect(keys.slice(keys.indexOf("clientes"), keys.indexOf("vendas") + 1)).toEqual(["clientes", "prospeccao", "vendas"]);
    const entries = sections.find((section) => section.key === "prospeccao")?.items ?? [];
    expect(entries.map((entry) => entry.href)).toContain("/dashboard/prospecting/instagram");
    expect(entries.map((entry) => entry.href)).toContain("/dashboard/outreach/activity");
    expect(entries.map((entry) => entry.href)).toContain("/dashboard/prospecting/instagram#followups");
    for (const entry of entries) {
      expect(sections.flatMap((section) => section.items).filter((item) => item.key === entry.key)).toHaveLength(1);
      expect(getTopLevelGroupForRoute(entry)).toBe("prospeccao");
    }
    expect(TOP_LEVEL_GROUPS.find((section) => section.key === "prospeccao")?.label).toBe("Prospeção");
  });

  it("preserves module and route permission filtering", () => {
    const sections = buildTopLevelSections([], (key) => key !== "prospecting-instagram");
    const keys = sections.flatMap((section) => section.items.map((entry) => entry.key));
    expect(keys).not.toContain("prospecting");
    expect(keys).not.toContain("google-local");
    expect(keys).not.toContain("professional-prosp");
    expect(keys).not.toContain("prospecting-instagram");
  });

  it("preserves explicit workspace hiding of the prospecting subgroup and routes", () => {
    expect(resolveRouteVisibility({ "nav_group:comercial-prospecting": "hidden" }, "prospecting-instagram")).toBe("hidden");
    expect(resolveRouteVisibility({ "route:google-local": "locked" }, "google-local")).toBe("locked");
  });

  it("matches overview exactly and each nested destination with unrelated query parameters", () => {
    expect(isNavigationRouteActive("/dashboard/prospecting", "/dashboard/prospecting/instagram", "", "", true)).toBe(false);
    expect(isNavigationRouteActive("/dashboard/prospecting/instagram", "/dashboard/prospecting/instagram", "?nav=adaptive", "", true)).toBe(true);
    expect(isNavigationRouteActive("/dashboard/prospecting/instagram", "/dashboard/prospecting/instagram", "", "#followups", true)).toBe(false);
    expect(isNavigationRouteActive("/dashboard/prospecting/instagram#followups", "/dashboard/prospecting/instagram", "?nav=adaptive", "#followups")).toBe(true);
    expect(isNavigationRouteActive("/dashboard/prospecting/instagram#followups", "/dashboard/prospecting/instagram", "", "")).toBe(false);
  });

  it("keeps the alternate IX menu destinations unique", () => {
    const keys = IX_NAV_SECTIONS.flatMap((section) => section.groups.flatMap((group) => group.children?.map((child) => child.key) ?? []));
    for (const entry of ROUTE_MANIFEST.filter((route) => route.group === "comercial-prospecting")) {
      expect(keys.filter((key) => key === entry.key)).toHaveLength(1);
    }
  });
});