/**
 * Validador de NIF português (sem dependência externa).
 * Implementa o algoritmo de validação mod 11.
 */

export function validateNif(nif: string): boolean {
  const cleaned = nif.replace(/[\s.-]/g, "");
  if (!/^\d{9}$/.test(cleaned)) return false;

  const validPrefixes = ["1", "2", "3", "5", "6", "8", "45", "70", "71", "72", "74", "75", "77", "78", "79", "90", "91", "98", "99"];
  const hasValidPrefix = validPrefixes.some((p) => cleaned.startsWith(p));
  if (!hasValidPrefix) return false;

  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + Number(cleaned[i]) * w, 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === Number(cleaned[8]);
}

export function formatNif(nif: string): string {
  const cleaned = nif.replace(/\D/g, "").slice(0, 9);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}

/** Comprimento máximo aceite para NIF/VAT nacional ou estrangeiro. */
export const TAX_ID_MAX_LENGTH = 20;

/**
 * Normaliza a escrita de um NIF nacional ou estrangeiro (ex.: ESB12345678,
 * DE123456789, LU12345678, NIF de Angola/Cabo Verde): maiúsculas, apenas
 * letras e números, sem espaços/pontos/traços, até 20 caracteres.
 */
export function normalizeTaxIdInput(value: string): string {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, TAX_ID_MAX_LENGTH);
}

/** NIF português pesquisável (9 dígitos, sem prefixo de país). */
export function isPortugueseNifCandidate(value: string): boolean {
  const v = normalizeTaxIdInput(value).replace(/^PT/, "");
  return /^\d{9}$/.test(v);
}

/** Devolve os 9 dígitos de um NIF português, aceitando prefixo PT. */
export function toPortugueseNif(value: string): string {
  return normalizeTaxIdInput(value).replace(/^PT/, "");
}
