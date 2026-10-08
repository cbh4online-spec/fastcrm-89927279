/** Sincronização da categoria do catálogo com ?category= (preserva q e restantes parâmetros). */
export function readCategoryParam(params: URLSearchParams): string | undefined {
  const v = params.get("category")?.trim();
  return v ? v : undefined;
}

export function withCategoryParam(params: URLSearchParams, categoryId?: string | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (categoryId) next.set("category", categoryId);
  else next.delete("category");
  return next;
}
