// Regras puras das chamadas WhatsApp via Z-API (sem APIs Deno, testáveis no vitest).

/** Número no formato Z-API (só dígitos com indicativo). Números PT de 9 dígitos ganham 351. */
export function toZapiPhone(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (d.length === 9 && /^[29]/.test(d)) return `351${d}`;
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

/** Limite anti-bloqueio: chamadas iniciadas por organização por hora. */
export const ZAPI_CALLS_PER_HOUR = 30;
/** Intervalo mínimo entre chamadas para o mesmo número (segundos). */
export const ZAPI_SAME_NUMBER_COOLDOWN_S = 60;

export type CallGate =
  | { ok: true }
  | { ok: false; code: "INVALID_PHONE" | "OPTED_OUT" | "CONSENT_CHECK_FAILED" | "NOT_CONNECTED" | "RATE_LIMITED" | "COOLDOWN"; message: string };

export function canStartZapiCall(i: {
  phone: string | null; connected: boolean; checkFailed: boolean; optedOut: boolean;
  callsLastHour: number; secondsSinceLastSameNumber: number | null;
}): CallGate {
  if (!i.connected) return { ok: false, code: "NOT_CONNECTED", message: "O WhatsApp (Z-API) não está ligado." };
  if (!i.phone) return { ok: false, code: "INVALID_PHONE", message: "Número inválido para WhatsApp." };
  if (i.checkFailed) return { ok: false, code: "CONSENT_CHECK_FAILED", message: "Não foi possível confirmar o consentimento. Chamada bloqueada por segurança." };
  if (i.optedOut) return { ok: false, code: "OPTED_OUT", message: "Este contacto pediu para não ser contactado por WhatsApp." };
  if (i.callsLastHour >= ZAPI_CALLS_PER_HOUR) return { ok: false, code: "RATE_LIMITED", message: `Limite de ${ZAPI_CALLS_PER_HOUR} chamadas por hora atingido, para proteger o número.` };
  if (i.secondsSinceLastSameNumber !== null && i.secondsSinceLastSameNumber < ZAPI_SAME_NUMBER_COOLDOWN_S)
    return { ok: false, code: "COOLDOWN", message: "Ligou a este número há instantes. Aguarde um minuto." };
  return { ok: true };
}
