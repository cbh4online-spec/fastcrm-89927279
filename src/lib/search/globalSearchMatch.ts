/**
 * Correspondência da pesquisa global (lupa): texto, telefone e NIF normalizados.
 * "913 428 951", "+351 913 428 951" e "00351913428951" encontram "+351913428951".
 */
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function corePhoneDigits(v: unknown): string {
  let d = digits(v);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("351") && d.length === 12) d = d.slice(3);
  return d;
}

export interface SearchFields {
  text?: Array<string | null | undefined>;
  phones?: Array<string | null | undefined>;
  taxIds?: Array<string | null | undefined>;
}

export function matchesGlobalSearch(rawQuery: string, fields: SearchFields): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  if ((fields.text ?? []).some((t) => t && t.toLowerCase().includes(q))) return true;

  const qd = corePhoneDigits(q);
  // Só tratar como número se a pesquisa for essencialmente numérica.
  const isNumeric = qd.length >= 3 && q.replace(/[\s+().\-\/]/g, "").replace(/^pt/i, "") === digits(q);
  if (!isNumeric) return false;
  if ((fields.phones ?? []).some((p) => p && corePhoneDigits(p).includes(qd))) return true;
  if ((fields.taxIds ?? []).some((t) => t && digits(t).includes(digits(q)))) return true;
  return false;
}
