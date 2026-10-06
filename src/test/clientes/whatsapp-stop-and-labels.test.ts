import { describe, it, expect } from "vitest";

import { resolveWhatsAppAvailability as resolveWa } from "@/lib/whatsapp/availability";
import { displayLabel as dl } from "@/lib/crm/displayLabels";
describe("WhatsApp — regras de paragem na comunicação assistida", () => {
  const base = { phone: "912345678", hasWhatsapp: true };
  it("opt-out fecha os botões", () => expect(resolveWa({ ...base, optedOut: true }).canOpen).toBe(false));
  it("consentimento revogado fecha os botões", () => expect(resolveWa({ ...base, consentRevoked: true }).canOpen).toBe(false));
  it("preferência WhatsApp desligada fecha os botões", () => expect(resolveWa({ ...base, preferenceOff: true }).canOpen).toBe(false));
  it("verificações pendentes ou com erro fecham (fail-closed)", () => expect(resolveWa({ ...base, checksPending: true }).canOpen).toBe(false));
  it("bloqueio tem prioridade sobre confirmado", () => expect(resolveWa({ ...base, isBlocked: true }).status).toBe("blocked"));
  it("sem sinais de paragem, número não confirmado continua assistido", () => expect(resolveWa({ phone: "912345678" }).status).toBe("unconfirmed"));
});
describe("Rótulos pt-PT", () => {
  it("traduz valores internos", () => {
    expect(dl("consumidor_final")).toBe("Consumidor final");
    expect(dl("new")).toBe("Novo");
    expect(dl("owner")).toBe("Proprietário");
    expect(dl("admin")).toBe("Administrador");
  });
});
