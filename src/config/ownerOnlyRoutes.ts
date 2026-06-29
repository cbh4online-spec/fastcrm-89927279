/**
 * Rotas exclusivas do workspace dono do produto (METODOPARE).
 * Estas rotas/keys ficam ocultas da sidebar/pesquisa e bloqueadas por guarda
 * em qualquer outro workspace.
 */
export const OWNER_WORKSPACE_SLUG = "metodopare";

export const OWNER_ONLY_ROUTE_KEYS = new Set<string>(["pitch"]);

export const OWNER_ONLY_PATH_PREFIXES = ["/dashboard/pitch"];

export function isOwnerOnlyPath(pathname: string): boolean {
  return OWNER_ONLY_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function isOwnerWorkspace(slug: string | null | undefined): boolean {
  return (slug ?? "").toLowerCase() === OWNER_WORKSPACE_SLUG;
}
