import { describe, it, expect } from "vitest";
import { sortRecommended, recommendedTier } from "./recommendedRank";

describe("ordenação Recomendados", () => {
  it("coloca kits e equipamentos principais antes de acessórios", () => {
    const list = sortRecommended([
      { id: "a", name: "Ajax Bateria de Apoio para Hub" },
      { id: "b", name: "Ajax Soporte para fotodetector MotionCam" },
      { id: "c", name: "Ajax Hub 2 Plus central de alarme" },
      { id: "d", name: "Ajax StarterKit Cam" },
    ]);
    expect(list.map((p) => p.id)).toEqual(["d", "c", "a", "b"]);
  });

  it("um suporte para detetor é acessório, não equipamento principal", () => {
    expect(recommendedTier({ id: "x", name: "Suporte para MotionProtect" })).toBe(4);
  });

  it("respeita a ordem manual definida pela loja", () => {
    expect(recommendedTier({ id: "x", name: "Ajax Bateria", store_sort_order: 1 })).toBe(0);
  });
});
