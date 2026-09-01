export type AudienceRecordSource = "contacts" | "leads" | "companies";

/** Fontes que suportam filtro por tag (coluna `tags` existente e indexada). */
export function supportsTagFilter(source: AudienceRecordSource): boolean {
  return source === "contacts" || source === "leads";
}

/** Devolve a tag normalizada a aplicar, ou null quando não aplicável. */
export function normalizedTagFilter(
  source: AudienceRecordSource,
  tagFilter: string,
): string | null {
  if (!supportsTagFilter(source)) return null;
  const tag = tagFilter.trim();
  return tag.length > 0 ? tag : null;
}

/** Chave de origem preservada em cada destinatário (contact_id / lead_id / company_id). */
export function originKey(source: AudienceRecordSource): "contact_id" | "lead_id" | "company_id" {
  if (source === "contacts") return "contact_id";
  if (source === "leads") return "lead_id";
  return "company_id";
}
