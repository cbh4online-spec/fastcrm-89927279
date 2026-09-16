import { describe, expect, it } from "vitest";
import { normalizeStoreFaq, resolveStoreProductContent } from "@/lib/store/productContent";

describe("resolveStoreProductContent", () => {
  it("dá prioridade ao conteúdo próprio do produto", () => {
    const result = resolveStoreProductContent(
      {
        short_description: "Resumo próprio",
        commercial_description: "Descrição própria",
        benefits: ["Benefício próprio"],
      },
      {
        ai_short_description: "Resumo IA",
        ai_long_description: "Descrição IA",
        ai_key_features: ["Funcionalidade IA"],
      },
    );

    expect(result.shortDescription).toBe("Resumo próprio");
    expect(result.longDescription).toBe("Descrição própria");
    expect(result.highlights).toEqual(["Benefício próprio"]);
  });

  it("preenche lacunas com o AI Commerce", () => {
    const result = resolveStoreProductContent(
      { short_description: "  ", commercial_description: null, benefits: [] },
      {
        ai_short_description: "Resumo IA",
        ai_long_description: "Descrição IA",
        ai_key_features: ["Funcionalidade IA", " "],
        ai_target_audience: "Instaladores",
        ai_use_cases: ["Casa", ""],
      },
    );

    expect(result.shortDescription).toBe("Resumo IA");
    expect(result.longDescription).toBe("Descrição IA");
    expect(result.highlights).toEqual(["Funcionalidade IA"]);
    expect(result.useCases).toEqual(["Casa"]);
    expect(result.hasAIContext).toBe(true);
  });

  it("não inventa conteúdo quando não existe AI Commerce", () => {
    const result = resolveStoreProductContent({ short_description: null }, null);
    expect(result.shortDescription).toBeNull();
    expect(result.longDescription).toBeNull();
    expect(result.highlights).toEqual([]);
    expect(result.faq).toEqual([]);
    expect(result.hasAIContext).toBe(false);
  });
});

describe("normalizeStoreFaq", () => {
  it("descarta entradas inválidas e limita o total", () => {
    const faq = normalizeStoreFaq([
      { question: "P1", answer: "R1" },
      { question: " ", answer: "R2" },
      { question: "P3" },
      "texto",
    ]);
    expect(faq).toEqual([{ question: "P1", answer: "R1" }]);
    expect(normalizeStoreFaq(null)).toEqual([]);
  });
});
