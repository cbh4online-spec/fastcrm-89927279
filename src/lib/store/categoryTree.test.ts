import { describe, it, expect } from "vitest";
import { descendantIds, countByVisibleRoot, visibleRoots, type CategoryNode } from "./categoryTree";

const W = "ws-ajax";
const O = "ws-other";
const nodes: CategoryNode[] = [
  { id: "intrusao", workspace_id: W, parent_id: null, name: "Intrusão", store_visible: true },
  { id: "detetores", workspace_id: W, parent_id: "intrusao", name: "Detetores", store_visible: false },
  { id: "pir", workspace_id: W, parent_id: "detetores", name: "PIR", store_visible: false },
  { id: "cctv", workspace_id: W, parent_id: null, name: "CCTV", store_visible: true },
  { id: "foreign-child", workspace_id: O, parent_id: "intrusao", name: "X", store_visible: false },
  { id: "other-root", workspace_id: O, parent_id: null, name: "Other", store_visible: true },
];

describe("categoryTree", () => {
  it("raiz inclui todos os descendentes recursivamente", () => {
    expect(descendantIds(nodes, "intrusao").sort()).toEqual(["detetores", "intrusao", "pir"]);
  });

  it("link antigo de filho oculto mostra só os seus produtos", () => {
    expect(descendantIds(nodes, "pir")).toEqual(["pir"]);
    expect(descendantIds(nodes, "detetores").sort()).toEqual(["detetores", "pir"]);
  });

  it("não conta produtos em duplicado", () => {
    const counts = countByVisibleRoot(
      nodes,
      [
        { store_category_id: "intrusao" },
        { store_category_id: "detetores" },
        { store_category_id: "pir" },
        { store_category_id: "cctv" },
        { store_category_id: null },
      ],
      W,
    );
    expect(counts).toEqual({ intrusao: 3, cctv: 1 });
  });

  it("isola workspaces: filhos/produtos de outro workspace não entram", () => {
    expect(descendantIds(nodes, "intrusao")).not.toContain("foreign-child");
    const counts = countByVisibleRoot(nodes, [{ store_category_id: "foreign-child" }, { store_category_id: "other-root" }], W);
    expect(counts).toEqual({});
    expect(visibleRoots(nodes, W).map((n) => n.id)).toEqual(["intrusao", "cctv"]);
  });

  it("tolera ciclos", () => {
    const cyc: CategoryNode[] = [
      { id: "a", workspace_id: W, parent_id: "b", name: "A", store_visible: true },
      { id: "b", workspace_id: W, parent_id: "a", name: "B", store_visible: true },
    ];
    expect(descendantIds(cyc, "a").sort()).toEqual(["a", "b"]);
  });
});
