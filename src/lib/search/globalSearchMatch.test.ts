import { describe, it, expect } from "vitest";
import { matchesGlobalSearch } from "./globalSearchMatch";

describe("matchesGlobalSearch", () => {
  const phones = ["+351913428951"];
  it("encontra telefone com espaços", () => expect(matchesGlobalSearch("913 428 951", { phones })).toBe(true));
  it("encontra telefone com indicativo", () => expect(matchesGlobalSearch("+351 913 428 951", { phones })).toBe(true));
  it("encontra telefone guardado sem indicativo", () =>
    expect(matchesGlobalSearch("00351913428951", { phones: ["913428951"] })).toBe(true));
  it("encontra NIF com espaços", () => expect(matchesGlobalSearch("139 090 800", { taxIds: ["139090800"] })).toBe(true));
  it("encontra email", () => expect(matchesGlobalSearch("TATIANA@", { text: ["tatiana@gmail.com"] })).toBe(true));
  it("não encontra número diferente", () => expect(matchesGlobalSearch("912 000 000", { phones })).toBe(false));
  it("texto não corresponde a dígitos de telefone", () => expect(matchesGlobalSearch("ana 9", { phones })).toBe(false));
});
