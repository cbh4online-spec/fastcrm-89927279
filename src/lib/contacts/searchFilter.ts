/** Torna o texto seguro para filtros ilike dentro de .or(...) (vírgulas/parênteses partem o filtro). */
export function sanitizeIlikeTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[\\%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, " ")
    .trim();
}

export function buildContactSearchOr(raw: string): string | null {
  const t = sanitizeIlikeTerm(raw);
  if (!t) return null;
  return `name.ilike.%${t}%,email.ilike.%${t}%,company.ilike.%${t}%`;
}
