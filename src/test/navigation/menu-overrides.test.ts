import { describe, expect, it } from "vitest";
import {
  buildOverrideMap,
  resolveNavGroupVisibility,
  resolveRouteVisibility,
} from "@/config/menuOverrides";
import { ROUTE_MANIFEST } from "@/config/routeManifest";

describe("menu overrides por workspace", () => {
  const sequences = ROUTE_MANIFEST.find((route) => route.key === "sequences");

  it("uma regra hidden da rota prevalece sobre grupos visíveis", () => {
    expect(sequences).toBeDefined();
    if (!sequences) return;

    const map = buildOverrideMap([
      { item_type: "top_group", item_key: "comunicacao", visibility: "visible" },
      { item_type: "nav_group", item_key: sequences.group, visibility: "visible" },
      { item_type: "route", item_key: sequences.key, visibility: "hidden" },
    ]);

    expect(resolveRouteVisibility(map, sequences)).toBe("hidden");
  });

  it("uma rota sem regra herda hidden do respetivo subgrupo", () => {
    expect(sequences).toBeDefined();
    if (!sequences) return;

    const map = buildOverrideMap([
      { item_type: "nav_group", item_key: sequences.group, visibility: "hidden" },
    ]);

    expect(resolveNavGroupVisibility(map, sequences.group)).toBe("hidden");
    expect(resolveRouteVisibility(map, sequences)).toBe("hidden");
  });

  it("uma regra visible explícita da rota prevalece sobre o subgrupo oculto", () => {
    expect(sequences).toBeDefined();
    if (!sequences) return;

    const map = buildOverrideMap([
      { item_type: "nav_group", item_key: sequences.group, visibility: "hidden" },
      { item_type: "route", item_key: sequences.key, visibility: "visible" },
    ]);

    expect(resolveRouteVisibility(map, sequences)).toBe("visible");
  });
});