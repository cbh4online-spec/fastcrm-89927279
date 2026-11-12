/**
 * Normalização canónica para pesquisas: ignora maiúsculas/minúsculas e acentos.
 * "  Luísa PEÑA " -> "luisa pena"
 */
export function normalizeSearchTerm(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** true se algum dos campos contém o termo (sem acentos e sem maiúsculas). */
export function matchesSearch(target: unknown | unknown[], rawQuery: string): boolean {
  const q = normalizeSearchTerm(rawQuery);
  if (!q) return true;
  const list = Array.isArray(target) ? target : [target];
  return list.some((v) => normalizeSearchTerm(v).includes(q));
}

/**
 * true se cada palavra do termo existe em pelo menos um dos campos
 * (sem acentos, sem maiúsculas, ordem das palavras livre).
 * "marques simone" encontra "Simone Marques".
 */
export function matchesAllWords(fields: unknown[], rawQuery: string): boolean {
  const words = normalizeSearchTerm(rawQuery).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.map((f) => normalizeSearchTerm(f)).join(" ");
  return words.every((w) => haystack.includes(w));
}
