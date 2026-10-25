/**
 * Allowlist de destinos. Única fonte de verdade para o painel e o service worker.
 *
 * Produção: apenas https://fastcrm.metodopare.ai.
 * DEV: acrescentar origens a DEV_EXTRA_ORIGINS manualmente numa cópia local
 * (nunca em builds distribuídas). Não há override por configuração do utilizador.
 */

export const FASTCRM_ORIGIN = "https://fastcrm.metodopare.ai";
export const WHATSAPP_WEB_ORIGIN = "https://web.whatsapp.com";

/** Override DEV explícito — manter vazio no repositório. */
export const DEV_EXTRA_ORIGINS = Object.freeze([]);

/** Rotas confirmadas no código da app (ver docs/IMPLEMENTACAO.md). */
export const FASTCRM_ROUTES = Object.freeze({
  home: "/dashboard",
  auth: "/auth",
  inbox: "/dashboard/inbox",
  leads: "/dashboard/leads",
  contacts: "/dashboard/contacts",
  lookup: "/dashboard/whatsapp-pro/lookup",
  pipeline: "/dashboard/opportunities",
  tasks: "/dashboard/tasks",
});

export function allowedFastcrmOrigins() {
  return [FASTCRM_ORIGIN, ...DEV_EXTRA_ORIGINS];
}

const ALLOWED_PATHS = new Set(Object.values(FASTCRM_ROUTES));
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DETAIL_PATH_RE = /^\/dashboard\/(contacts|leads)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Ficha de contacto/lead: só UUID, origem fixa, sem query/hash. */
export function detailUrl(kind, id) {
  if ((kind !== "contacts" && kind !== "leads") || typeof id !== "string" || !UUID_RE.test(id)) return null;
  return `${FASTCRM_ORIGIN}/dashboard/${kind}/${encodeURIComponent(id)}`;
}

/**
 * Valida um URL de destino. Só aceita:
 *  - origem FastCRM permitida + caminho da lista de rotas, sem query/hash/credenciais;
 *  - WhatsApp Web na raiz.
 */
export function isAllowedUrl(raw) {
  if (typeof raw !== "string" || raw.length > 500) return false;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.search || url.hash) return false;

  if (url.origin === WHATSAPP_WEB_ORIGIN) return url.pathname === "/";
  if (!allowedFastcrmOrigins().includes(url.origin)) return false;
  return ALLOWED_PATHS.has(url.pathname) || DETAIL_PATH_RE.test(url.pathname);
}

export function fastcrmUrl(routeKey) {
  const path = FASTCRM_ROUTES[routeKey];
  if (!path) return null;
  return FASTCRM_ORIGIN + path;
}
