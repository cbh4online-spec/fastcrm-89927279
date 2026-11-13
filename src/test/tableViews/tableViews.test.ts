import { describe, it, expect } from "vitest";
import { cleanFilters, upsertView, parseViews } from "@/lib/tableViews/tableViews";

const v = (id: string, name: string) => ({ id, name, createdAt: "", visibleColumns: [], columnOrder: [], filters: {} });

describe("tableViews", () => {
  it("não guarda a página nem filtros vazios", () => {
    expect(cleanFilters({ page: 3, pageSize: 50, status: "", tags: [], source: "ig" })).toEqual({ pageSize: 50, source: "ig" });
  });
  it("vista com o mesmo nome substitui a anterior", () => {
    const out = upsertView([v("1", "Quentes")], v("2", "quentes "));
    expect(out.map((x) => x.id)).toEqual(["2"]);
  });
  it("ignora dados corrompidos", () => {
    expect(parseViews("{oops")).toEqual([]);
  });
});
