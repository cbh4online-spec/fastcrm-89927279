// Tipo de portal do cliente por workspace.
// "services": agência/serviços (projetos, suporte, horas) — sem loja nem conteúdos cosméticos.
// "store": portal B2B de produtos (catálogo, carrinho, encomendas).
export type ClientPortalMode = "services" | "store";

// Workspaces de serviços (hard-listed, como a taxonomia fechada da loja).
export const SERVICES_PORTAL_WORKSPACE_IDS = new Set<string>([
  "d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f", // METODOPARE
]);

export function portalModeFor(workspaceId: string | null | undefined): ClientPortalMode {
  return workspaceId && SERVICES_PORTAL_WORKSPACE_IDS.has(workspaceId) ? "services" : "store";
}

// Rotas permitidas no portal de serviços; tudo o resto vai para /client/work.
export const SERVICES_PORTAL_PATHS = [
  "/client/work",
  "/client/support",
  "/client/invoices",
  "/client/financial",
  "/client/contracts",
  "/client/team",
  "/client/security",
  "/client/approvals",
];

export function isAllowedInServicesPortal(pathname: string): boolean {
  return SERVICES_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Destino seguro depois do login: o portal de serviços nunca abre a loja B2B. */
export function portalLandingPath(mode: ClientPortalMode, requested: string): string {
  if (mode === "services") return isAllowedInServicesPortal(requested) ? requested : "/client/work";
  return requested;
}
