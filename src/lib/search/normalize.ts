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
