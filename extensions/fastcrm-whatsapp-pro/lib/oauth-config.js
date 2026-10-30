/**
 * Configuração OAuth 2.1 (servidor de autorização do FastCRM / Lovable Cloud).
 *
 * - Endpoints fixos, confirmados no discovery público
 *   /.well-known/oauth-authorization-server/auth/v1 (GET, sem tokens).
 * - PUBLIC_CLIENT_ID está VAZIO DE PROPÓSITO: só deve ser preenchido com o
 *   client_id público oficial depois de registar o cliente OAuth (tipo público,
 *   PKCE obrigatório, redirect exato chrome.identity.getRedirectURL("oauth2")).
 *   Ver docs/fastcrm-whatsapp-pro/V0.4-ARQUITETURA-E-OPERACAO.md.
 * - Nunca colocar aqui client_secret, chaves ou tokens.
 */
export const AUTH_ORIGIN = "https://eumnfkccyvlyoyjchiwe.supabase.co";
export const AUTHORIZE_ENDPOINT = AUTH_ORIGIN + "/auth/v1/oauth/authorize";
export const TOKEN_ENDPOINT = AUTH_ORIGIN + "/auth/v1/oauth/token";
export const PUBLIC_CLIENT_ID = "498e10aa-441f-4ded-9e73-81979d751acf";
export const SCOPES = "email"; // sem "openid" até haver chaves de assinatura assimétricas verificadas (OIDC)
export const REDIRECT_PATH = "oauth2";
export const NETWORK_TIMEOUT_MS = 15000;

export function isOAuthConfigured(clientId = PUBLIC_CLIENT_ID) {
  return typeof clientId === "string" && /^[A-Za-z0-9._-]{8,128}$/.test(clientId);
}

/**
 * API de leitura (iteração 4B). Endpoint fixo; nunca configurável pelo utilizador.
 * API_READY=false até um administrador confirmar flags backend + E2E.
 * PUBLIC_API_KEY: só uma chave PÚBLICA (anon/publishable) e só se o gateway a exigir.
 * Chaves privadas (chave de serviço, secrets) são PROIBIDAS na extensão.
 */
export const API_ENDPOINT = AUTH_ORIGIN + "/functions/v1/fastcrm-whatsapp-extension-api";
export const API_READY = true;
export const API_REQUIRES_PUBLIC_KEY = false;
export const PUBLIC_API_KEY = "";
export const API_TIMEOUT_MS = 12000;

export function isLookupReady({ clientId = PUBLIC_CLIENT_ID, apiReady = API_READY, requiresKey = API_REQUIRES_PUBLIC_KEY, publicKey = PUBLIC_API_KEY } = {}) {
  return isOAuthConfigured(clientId) && apiReady === true && (!requiresKey || (typeof publicKey === "string" && publicKey.length > 20));
}
