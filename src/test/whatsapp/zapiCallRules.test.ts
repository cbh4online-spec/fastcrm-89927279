import { describe, it, expect } from "vitest";
import { canStartZapiCall, toZapiPhone } from "../../../supabase/functions/_shared/zapiCallRules";

const base = { phone: "351912345678", connected: true, checkFailed: false, optedOut: false, callsLastHour: 0, secondsSinceLastSameNumber: null };

describe("chamadas WhatsApp Z-API", () => {
  it("acrescenta 351 a números PT de 9 dígitos", () => expect(toZapiPhone("912 345 678")).toBe("351912345678"));
  it("bloqueia contactos com opt-out", () => expect(canStartZapiCall({ ...base, optedOut: true })).toMatchObject({ ok: false, code: "OPTED_OUT" }));
  it("falha fechado quando a verificação de consentimento falha", () => expect(canStartZapiCall({ ...base, checkFailed: true })).toMatchObject({ ok: false, code: "CONSENT_CHECK_FAILED" }));
  it("limita a 30 chamadas por hora", () => expect(canStartZapiCall({ ...base, callsLastHour: 30 })).toMatchObject({ ok: false, code: "RATE_LIMITED" }));
  it("exige 60 s entre chamadas ao mesmo número", () => {
    expect(canStartZapiCall({ ...base, secondsSinceLastSameNumber: 59 })).toMatchObject({ ok: false, code: "COOLDOWN" });
    expect(canStartZapiCall({ ...base, secondsSinceLastSameNumber: 61 })).toEqual({ ok: true });
  });
});
