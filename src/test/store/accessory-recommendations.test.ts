import { describe, expect, it } from "vitest";
import { suggestAccessories } from "@/lib/store/accessoryRecommendations";

const base = {
  id: "p1",
  name: "Câmara IP exterior Ajax",
  category: "Videovigilância",
  subcategory: "Câmaras IP",
  price: 300,
  context: "videovigilancia exterior poe gravacao",
};

describe("suggestAccessories", () => {
  it("prioriza acessórios reais e ignora o próprio produto", () => {
    const result = suggestAccessories(base, [
      { id: "p1", name: "Câmara IP exterior Ajax", price: 300, category: "Videovigilância" },
      { id: "p2", name: "Suporte de fixação para câmara", price: 25, category: "Videovigilância", subcategory: "Acessórios" },
      { id: "p3", name: "Consola de formação", price: 900, category: "Formação" },
    ]);

    expect(result.map((r) => r.id)).toEqual(["p2"]);
    expect(result[0].reason).toBe("Acessório compatível");
  });

  it("exclui esgotados e preços inválidos", () => {
    const result = suggestAccessories(base, [
      { id: "p4", name: "Cabo de rede 20m", price: 12, stockStatus: "out_of_stock" },
      { id: "p5", name: "Fonte de alimentação 12V", price: 0 },
      { id: "p6", name: "Fonte de alimentação 12V", price: 18 },
    ]);

    expect(result.map((r) => r.id)).toEqual(["p6"]);
  });

  it("devolve lista vazia sem candidatos relevantes", () => {
    expect(suggestAccessories(base, [{ id: "x", name: "Livro", price: 10 }])).toEqual([]);
  });
});
