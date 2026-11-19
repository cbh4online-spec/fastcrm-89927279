import { describe, it, expect } from "vitest";
import { normalizeTaxIdInput, isPortugueseNifCandidate, toPortugueseNif } from "@/utils/nif";

describe("NIF estrangeiro", () => {
  it("aceita NIF espanhol com letra", () => expect(normalizeTaxIdInput("esb-1234.5678")).toBe("ESB12345678"));
  it("aceita VAT alemão", () => expect(normalizeTaxIdInput("DE 123 456 789")).toBe("DE123456789"));
  it("aceita VAT luxemburguês", () => expect(normalizeTaxIdInput("LU12345678")).toBe("LU12345678"));
  it("aceita NIF angolano de 10 dígitos", () => expect(normalizeTaxIdInput("5417012345")).toBe("5417012345"));
  it("limita a 20 caracteres", () => expect(normalizeTaxIdInput("A".repeat(30))).toHaveLength(20));
  it("pesquisa automática só para NIF PT", () => {
    expect(isPortugueseNifCandidate("515855359")).toBe(true);
    expect(isPortugueseNifCandidate("PT515855359")).toBe(true);
    expect(isPortugueseNifCandidate("ESB12345678")).toBe(false);
    expect(isPortugueseNifCandidate("5417012345")).toBe(false);
    expect(toPortugueseNif("PT515855359")).toBe("515855359");
  });
});
