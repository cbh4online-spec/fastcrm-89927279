import { describe, it, expect } from "vitest";
import { consentPhoneKey } from "@/lib/whatsapp/consent";

/** Réplica da filtragem de consentimento usada no passo 2 do assistente de campanhas. */
function applyConsent(
  phones: string[],
  sets: { granted: Set<string>; optouts: Set<string> },
) {
  const stats = { withConsent: 0, withoutConsent: 0, optouts: 0 };
  const eligible: string[] = [];
  for (const p of phones) {
    const key = consentPhoneKey(p);
    if (sets.optouts.has(key)) { stats.optouts++; continue; }
    if (!sets.granted.has(key)) { stats.withoutConsent++; continue; }
    stats.withConsent++;
    eligible.push(p);
  }
  return { stats, eligible };
}

describe("filtro de consentimento WhatsApp", () => {
  const granted = new Set([consentPhoneKey("+351912345678")]);
  const optouts = new Set([consentPhoneKey("+351933333333")]);

  it("inclui apenas números com consentimento concedido", () => {
    const r = applyConsent(["+351912345678", "+351944444444"], { granted, optouts });
    expect(r.eligible).toEqual(["+351912345678"]);
    expect(r.stats.withConsent).toBe(1);
    expect(r.stats.withoutConsent).toBe(1);
  });

  it("exclui opt-outs mesmo que existisse consentimento anterior", () => {
    const r = applyConsent(["+351933333333"], { granted, optouts });
    expect(r.eligible).toHaveLength(0);
    expect(r.stats.optouts).toBe(1);
  });
});
