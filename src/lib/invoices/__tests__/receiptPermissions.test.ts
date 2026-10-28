import { describe, it, expect } from "vitest";
import { isValidChangeReason } from "../paymentChangeReason";
import { roleHasCapability } from "@/lib/permissions/capabilities";

describe("motivo obrigatório para corrigir/anular recibos", () => {
  it("recusa motivo vazio ou com menos de 3 caracteres", () => {
    expect(isValidChangeReason("")).toBe(false);
    expect(isValidChangeReason("  ab ")).toBe(false);
    expect(isValidChangeReason(undefined)).toBe(false);
  });
  it("aceita motivo com 3 ou mais caracteres", () => {
    expect(isValidChangeReason("abc")).toBe(true);
  });
});

describe("quem pode gerir recibos pelo papel", () => {
  it("agente não tem a permissão pelo papel (só por concessão individual)", () => {
    expect(roleHasCapability("agent", "finance.manage")).toBe(false);
  });
  it("dono e admin têm sempre a permissão", () => {
    expect(roleHasCapability("owner", "finance.manage")).toBe(true);
    expect(roleHasCapability("admin", "finance.manage")).toBe(true);
  });
});
