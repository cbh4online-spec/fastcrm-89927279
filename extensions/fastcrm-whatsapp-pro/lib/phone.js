/**
 * Normalização básica de números de telefone para E.164.
 * Sem dependências. Não valida se o número existe — apenas formato.
 *
 * Regras:
 *  - Aceita espaços, hífenes, pontos, parênteses e barras como separadores.
 *  - "+" ou "00" inicial → número internacional.
 *  - 9 dígitos começados por 2, 3 ou 9 → Portugal (+351).
 *  - Portugal (+351): exige exatamente 9 dígitos nacionais começados por 2, 3 ou 9.
 *  - Outros países: 8 a 15 dígitos totais (limite E.164), sem começar por 0.
 *  - Sem indicativo e sem padrão PT → rejeita (não adivinha o país).
 */

const SEPARATORS = /[\s\-.()/\u00A0]/g;

export function normalizePhone(raw) {
  if (typeof raw !== "string") return { ok: false, error: "Introduza um número." };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: "Introduza um número." };
  if (trimmed.length > 40) return { ok: false, error: "Número demasiado longo." };

  let s = trimmed.replace(SEPARATORS, "");
  let international = false;
  if (s.startsWith("+")) {
    international = true;
    s = s.slice(1);
  } else if (s.startsWith("00")) {
    international = true;
    s = s.slice(2);
  }

  if (!/^\d+$/.test(s)) {
    return { ok: false, error: "O número só pode conter dígitos, espaços e o prefixo + ou 00." };
  }

  let digits;
  if (international) {
    digits = s;
  } else if (/^[239]\d{8}$/.test(s)) {
    digits = "351" + s;
  } else {
    return { ok: false, error: "Indique o indicativo do país (ex.: +351) ou um número português de 9 dígitos." };
  }

  if (digits.startsWith("0")) return { ok: false, error: "Indicativo de país inválido." };

  if (digits.startsWith("351")) {
    const national = digits.slice(3);
    if (!/^[239]\d{8}$/.test(national)) {
      return { ok: false, error: "Número português inválido: deve ter 9 dígitos e começar por 2, 3 ou 9." };
    }
  } else if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "Número internacional inválido (8 a 15 dígitos com indicativo)." };
  }

  return { ok: true, e164: "+" + digits };
}
