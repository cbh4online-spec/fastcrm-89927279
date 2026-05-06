/**
 * Phone normalization helper (PT default).
 * Light implementation — extend with libphonenumber-js if richer parsing needed.
 */
export function normalizePhone(input: string, country: string = "PT"): string {
  if (!input) return "";
  const trimmed = input.trim().replace(/[\s().-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  // Default to PT (+351) when no country code
  if (country === "PT") {
    if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
    if (trimmed.startsWith("351")) return `+${trimmed}`;
    return `+351${trimmed}`;
  }
  if (country === "BR") {
    if (trimmed.startsWith("55")) return `+${trimmed}`;
    return `+55${trimmed}`;
  }
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

export function isPortugueseNumber(normalized: string): boolean {
  return normalized.startsWith("+351");
}
