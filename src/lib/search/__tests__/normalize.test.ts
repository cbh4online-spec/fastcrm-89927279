import { describe, it, expect } from "vitest";
import { matchesSearch, normalizeSearchTerm } from "../normalize";
import { matchesGlobalSearch } from "../globalSearchMatch";

describe("pesquisa sem acentos nem maiúsculas", () => {
  it("joao encontra João", () => expect(matchesSearch("João Silva", "joao")).toBe(true));
  it("LUÍSA encontra luisa peña", () => expect(matchesSearch("luisa peña", "LUÍSA PENA")).toBe(true));
  it("servicos encontra Serviços", () => expect(matchesSearch(["x", "Serviços"], "servicos")).toBe(true));
  it("não encontra termo ausente", () => expect(matchesSearch("Maria", "joao")).toBe(false));
  it("normaliza", () => expect(normalizeSearchTerm("  Ação ")).toBe("acao"));
  it("pesquisa global ignora acentos", () =>
    expect(matchesGlobalSearch("adelcia", { text: ["Adélcia Monteiro"] })).toBe(true));
  it("telefone continua a funcionar", () =>
    expect(matchesGlobalSearch("913 428 951", { phones: ["+351913428951"] })).toBe(true));
});
