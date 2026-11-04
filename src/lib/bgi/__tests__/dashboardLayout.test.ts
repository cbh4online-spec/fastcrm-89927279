import { describe, it, expect } from "vitest";
import { applyLayout, sanitizeLayout, MAX_VISIBLE_INDICATORS } from "../dashboardLayout";
import type { IndicatorDefinition } from "../indicatorCatalog";

const ind = (id: string) => ({ id } as IndicatorDefinition);
const all = [ind("a"), ind("b"), ind("c")];

describe("dashboardLayout", () => {
  it("aplica a ordem guardada e põe os novos no fim", () => {
    expect(applyLayout(all, { order: ["c", "a"], hidden: [] }).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
  it("esconde indicadores escondidos", () => {
    expect(applyLayout(all, { order: [], hidden: ["b"] }).map((i) => i.id)).toEqual(["a", "c"]);
  });
  it("ignora ids de modelos desativados", () => {
    expect(applyLayout(all, { order: ["zzz", "b"], hidden: ["yyy"] }).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
  it("limita a 40 visíveis", () => {
    const many = Array.from({ length: 50 }, (_, n) => ind(`i${n}`));
    expect(applyLayout(many, { order: [], hidden: [] })).toHaveLength(MAX_VISIBLE_INDICATORS);
  });
  it("sanitiza duplicados e ids inválidos", () => {
    expect(sanitizeLayout({ order: ["a", "a", "Bad Id", "b"], hidden: null as never })).toEqual({ order: ["a", "b"], hidden: [] });
  });
});
