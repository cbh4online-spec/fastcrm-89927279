import { describe, it, expect } from "vitest";
import {
  normalizeStoreKey,
  prepareCompetitorRefs,
  storeLabel,
} from "@/lib/pricing/competitorDisplay";

const ref = (
  id: string,
  price: number,
  source_name: string,
  source_url?: string,
  fetched_at?: string,
) => ({ id, price, source_name, source_url, fetched_at });

describe("normalizeStoreKey", () => {
  it("agrupa www e subdomínios genéricos", () => {
    expect(normalizeStoreKey("Strong Answer", "https://loja.strong-answer.com/p/1")).toBe(
      normalizeStoreKey("Strong Answer", "https://www.strong-answer.com/p/2"),
    );
  });

  it("agrupa nome sem TLD com o domínio equivalente", () => {
    expect(normalizeStoreKey("Aquario")).toBe(normalizeStoreKey("Aquario.pt"));
  });

  it("distingue lojas diferentes", () => {
    expect(normalizeStoreKey("Aquario", "https://aquario.pt")).not.toBe(
      normalizeStoreKey("Worten", "https://worten.pt"),
    );
  });
});

describe("storeLabel", () => {
  it("usa o domínio quando existe URL", () => {
    expect(storeLabel("qualquer coisa", "https://www.aquario.pt/produto")).toBe("aquario.pt");
  });

  it("cai para o nome quando não há URL", () => {
    expect(storeLabel("Aquario")).toBe("Aquario");
  });
});

describe("prepareCompetitorRefs", () => {
  it("mantém apenas um valor por loja, o mais alto", () => {
    const { refs } = prepareCompetitorRefs(
      [
        ref("1", 500, "Strong Answer", "https://loja.strong-answer.com/a"),
        ref("2", 620, "Strong Answer", "https://loja.strong-answer.com/b"),
      ],
      459.9,
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].price).toBe(620);
  });

  it("esconde referências iguais ou abaixo do nosso preço", () => {
    const { refs, hiddenCount } = prepareCompetitorRefs(
      [
        ref("1", 374.03, "Strong Answer", "https://loja.strong-answer.com/a"),
        ref("2", 459.9, "Aquario", "https://aquario.pt/a"),
        ref("3", 480, "Worten", "https://worten.pt/a"),
      ],
      459.9,
    );
    expect(refs.map((r) => r.price)).toEqual([480]);
    expect(hiddenCount).toBe(2);
  });

  it("devolve lista vazia quando todas as referências são mais baratas", () => {
    const result = prepareCompetitorRefs([ref("1", 300, "Aquario", "https://aquario.pt")], 459.9);
    expect(result.refs).toEqual([]);
    expect(result.cheapestVisible).toBeNull();
  });

  it("ordena do mais alto para o mais baixo e limita a 4 lojas", () => {
    const { refs, cheapestVisible } = prepareCompetitorRefs(
      [
        ref("1", 500, "A", "https://a.pt"),
        ref("2", 700, "B", "https://b.pt"),
        ref("3", 600, "C", "https://c.pt"),
        ref("4", 900, "D", "https://d.pt"),
        ref("5", 550, "E", "https://e.pt"),
      ],
      100,
      { max: 4 },
    );
    expect(refs.map((r) => r.price)).toEqual([900, 700, 600, 550]);
    expect(cheapestVisible).toBe(550);
  });

  it("ignora preços inválidos e devolve a recolha mais recente", () => {
    const { refs, lastFetchedAt } = prepareCompetitorRefs(
      [
        ref("1", 0, "A", "https://a.pt", "2026-09-10T10:00:00Z"),
        ref("2", 700, "B", "https://b.pt", "2026-09-16T10:00:00Z"),
      ],
      100,
    );
    expect(refs).toHaveLength(1);
    expect(lastFetchedAt).toBe("2026-09-16T10:00:00Z");
  });
});
