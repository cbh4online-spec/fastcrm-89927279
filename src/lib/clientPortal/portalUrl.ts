/** Link do portal do cliente sempre preso a um workspace (nunca depende de cache do navegador). */
export function clientPortalUrl(origin: string, workspaceSlug: string, next = "/client/work"): string {
  const params = new URLSearchParams({ workspace: workspaceSlug.toLowerCase(), next });
  return `${origin}/client/login?${params.toString()}`;
}

/** Só aceita destinos internos do portal, para evitar redireções abertas. */
export function safePortalNext(next: string | null): string {
  return next && /^\/client\/[a-z0-9/_-]*$/i.test(next) ? next : "/client/dashboard";
}
