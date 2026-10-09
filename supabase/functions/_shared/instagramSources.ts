/**
 * Regras das origens de recolha do extrator de Instagram, alinhadas com o
 * fornecedor configurado (RapidAPI instagram-looter2).
 *
 * Confirmado no fornecedor (pedidos reais, 9/10/2026):
 *  - /followers, /following, /hashtag-medias, /location-medias → 404 (não existem)
 *  - /tag-feeds?query=<hashtag>[&end_cursor] → 200, publicações com owner.id (sem username)
 *  - /location-feeds?id=<id>&tab=recent|top[&end_cursor] → formato equivalente
 *  - /id?id=<user_id> → 200 { username, user_id }
 */

export const UNSUPPORTED_SOURCES = ["followers", "following"] as const;

export const UNSUPPORTED_SOURCE_MESSAGE =
  "A recolha de seguidores e de perfis seguidos não é suportada pelo fornecedor de Instagram configurado. Nenhum pedido foi feito nem cobrado. Use Hashtag, Localização, Lista de @perfis ou Pesquisa na web.";

export function isUnsupportedSource(source: string): boolean {
  return (UNSUPPORTED_SOURCES as readonly string[]).includes(source);
}

/** Pedido de listagem para as origens suportadas pela API. */
export function listingRequest(
  source: string,
  target: string,
  cursor: string | null,
): { path: string; params: Record<string, string> } | null {
  let req: { path: string; params: Record<string, string> } | null = null;
  if (source === "hashtag") req = { path: "/tag-feeds", params: { query: target.replace(/^#/, "") } };
  else if (source === "location") req = { path: "/location-feeds", params: { id: target, tab: "recent" } };
  if (req && cursor) req.params.end_cursor = cursor;
  return req;
}

/** IDs de autores das publicações (owner.id), sem duplicados. */
export function collectOwnerIds(payload: unknown, limit = 200): string[] {
  const out = new Set<string>();
  const stack: unknown[] = [payload];
  while (stack.length && out.size < limit) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const v of node) stack.push(v);
      continue;
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      const owner = rec.owner as Record<string, unknown> | undefined;
      const id = owner?.id ?? owner?.pk;
      if ((typeof id === "string" && /^\d+$/.test(id)) || typeof id === "number") out.add(String(id));
      for (const v of Object.values(rec)) if (v && typeof v === "object") stack.push(v);
    }
  }
  return [...out];
}

/** Mensagem útil em português para uma falha do fornecedor (sem JSON cru). */
export function friendlyProviderError(status: number, endpoint: string): string {
  if (status === 404) return `O fornecedor de Instagram não disponibiliza este tipo de recolha (${endpoint}).`;
  if (status === 401 || status === 403) return "A chave da API de Instagram é inválida ou a subscrição não está ativa.";
  if (status === 402) return "A subscrição da API de Instagram não tem saldo ou plano para este pedido.";
  if (status === 429) return "Limite de pedidos da API de Instagram atingido. A recolha continua mais tarde.";
  if (status >= 500) return "O fornecedor de Instagram está temporariamente indisponível. Tente novamente mais tarde.";
  return `O fornecedor de Instagram recusou o pedido (código ${status}).`;
}
