import { describe, it, expect } from "vitest";
import { isCallWorthy, parseIcpScore } from "./icpScore";

describe("isCallWorthy", () => {
  it("70 ou mais vale uma ligação", () => {
    expect(isCallWorthy(70)).toBe(true);
    expect(isCallWorthy(69)).toBe(false);
    expect(isCallWorthy(null)).toBe(false);
  });
});

describe("parseIcpScore", () => {
  it("normaliza e limita a pontuação a 0–100 e 3 motivos", () => {
    const r = parseIcpScore('{"score":120,"summary":"Clínica certa","reasons":["a","b","c","d"]}');
    expect(r).toEqual({ score: 100, summary: "Clínica certa", reasons: ["a", "b", "c"] });
  });
  it("rejeita resposta sem resumo ou sem número", () => {
    expect(parseIcpScore({ score: 50, summary: "" })).toBeNull();
    expect(parseIcpScore({ score: "x", summary: "ok" })).toBeNull();
  });
});
