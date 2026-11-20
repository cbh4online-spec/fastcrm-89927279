export function readScopedMetaLead(value: unknown, entryPageId: string) {
  const isMetaId = (id: unknown): id is string =>
    typeof id === "string" && /^\d{1,32}$/.test(id);

  if (!isMetaId(entryPageId) || !value || typeof value !== "object") return null;

  const { form_id, leadgen_id, page_id } = value as Record<string, unknown>;
  if (!isMetaId(form_id) || !isMetaId(leadgen_id)) return null;
  if (page_id != null && page_id !== entryPageId) return null;

  return { formId: form_id, leadId: leadgen_id, pageId: entryPageId };
}
