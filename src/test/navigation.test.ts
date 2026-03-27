/**
 * Navigation Smoke Tests
 *
 * Validates the route manifest — single source of truth for FastCRM navigation.
 */
import { describe, it, expect } from "vitest";
import {
  ROUTE_MANIFEST,
  NAV_GROUPS,
  NAV_GROUP_ORDER,
  buildSidebarSections,
  getSidebarItems,
  getSearchableRoutes,
  getAllSearchablePages,
  type NavGroup,
} from "@/config/routeManifest";

describe("Route Manifest integrity", () => {
  it("every entry has a unique key", () => {
    const keys = ROUTE_MANIFEST.map((r) => r.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it("every entry has a non-empty href starting with /", () => {
    for (const r of ROUTE_MANIFEST) {
      expect(r.href).toBeTruthy();
      expect(r.href.startsWith("/")).toBe(true);
    }
  });

  it("every entry belongs to a valid NavGroup", () => {
    const validGroups = new Set(NAV_GROUP_ORDER);
    for (const r of ROUTE_MANIFEST) {
      expect(validGroups.has(r.group)).toBe(true);
    }
  });

  it("no duplicate labels within the same group (sidebar-visible only)", () => {
    for (const group of NAV_GROUP_ORDER) {
      const labels = ROUTE_MANIFEST
        .filter((r) => r.group === group && r.visibleInSidebar)
        .map((r) => r.label);
      const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
      expect(dupes).toEqual([]);
    }
  });

  it("no duplicate hrefs in the manifest", () => {
    const hrefs = ROUTE_MANIFEST.map((r) => r.href);
    const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    expect(dupes).toEqual([]);
  });

  it("all 9 nav groups are defined", () => {
    expect(NAV_GROUPS).toHaveLength(9);
    expect(NAV_GROUP_ORDER).toHaveLength(9);
    expect(NAV_GROUP_ORDER).toContain("inicio");
    expect(NAV_GROUP_ORDER).toContain("administracao");
  });
});

describe("Sidebar sections builder", () => {
  const allAccess = () => true;
  const noModules: string[] = [];
  const allModules = [
    "account-brief", "prospecting-pro", "lead-enricher", "google-local-services",
    "email-campaigns", "seo-growth", "bio-os", "instagram-looter",
    "proposals", "invoices", "online-store", "marketplace-c2c", "b2b-portal",
    "procurement", "student-journey", "security-ops", "credit-intermediation",
    "imo-ai",
  ];

  it("returns no empty groups when all modules active", () => {
    const sections = buildSidebarSections(allModules, allAccess);
    for (const s of sections) {
      expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it("hides module-gated items when no modules installed", () => {
    const sections = buildSidebarSections(noModules, allAccess);
    for (const s of sections) {
      for (const item of s.items) {
        expect(item.moduleSlug).toBeUndefined();
      }
    }
  });

  it("Início group is not collapsible", () => {
    const sections = buildSidebarSections(allModules, allAccess);
    const inicio = sections.find((s) => s.key === "inicio");
    expect(inicio).toBeDefined();
    expect(inicio!.collapsible).toBe(false);
  });

  it("hides groups entirely when all items are module-gated and no modules installed", () => {
    // Comércio requires online-store, marketplace-c2c, b2b-portal modules
    const sections = buildSidebarSections(noModules, allAccess);
    const comercio = sections.find((s) => s.key === "comercio");
    // Comércio should be hidden since all its items require modules
    expect(comercio).toBeUndefined();
  });
});

describe("Search routes", () => {
  it("getAllSearchablePages returns pages with path and label", () => {
    const pages = getAllSearchablePages();
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(p.path).toBeTruthy();
      expect(p.label).toBeTruthy();
    }
  });

  it("hidden entries do not appear in searchable pages", () => {
    const hiddenEntries = ROUTE_MANIFEST.filter((r) => r.status === "hidden");
    expect(hiddenEntries.length).toBeGreaterThan(0); // we have at least 'diagnostics'
    const pages = getAllSearchablePages();
    const pagePaths = new Set(pages.map((p) => p.path));
    for (const h of hiddenEntries) {
      expect(pagePaths.has(h.href)).toBe(false);
    }
  });

  it("hidden entries do not appear in sidebar sections", () => {
    const allAccess = () => true;
    const allModules = [
      "account-brief", "prospecting-pro", "lead-enricher", "google-local-services",
      "email-campaigns", "seo-growth", "bio-os", "instagram-looter",
      "proposals", "invoices", "online-store", "marketplace-c2c", "b2b-portal",
      "procurement", "student-journey", "security-ops", "credit-intermediation",
      "imo-ai",
    ];
    const sections = buildSidebarSections(allModules, allAccess);
    const allSidebarHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    const hiddenEntries = ROUTE_MANIFEST.filter((r) => r.status === "hidden");
    for (const h of hiddenEntries) {
      expect(allSidebarHrefs).not.toContain(h.href);
    }
  });
});

describe("Portal segregation", () => {
  it("no /client-portal routes in the manifest (separate navigation)", () => {
    const clientPortalRoutes = ROUTE_MANIFEST.filter((r) => r.href.startsWith("/client-portal"));
    expect(clientPortalRoutes).toHaveLength(0);
  });

  it("all manifest routes are /dashboard, /settings, or /super-admin prefixed", () => {
    for (const r of ROUTE_MANIFEST) {
      const valid =
        r.href.startsWith("/dashboard") ||
        r.href.startsWith("/settings") ||
        r.href.startsWith("/super-admin");
      expect(valid).toBe(true);
    }
  });
});
