/**
 * Cliente OAuth do service worker. Único dono dos tokens.
 * Tokens vivem só em chrome.storage.session (memória, apagada ao reiniciar o browser).
 * A UI só recebe estados: "config_pending" | "disconnected" | "connected".
 * Sem refresh nesta versão (falha fechada: token expirado = desligado).
 */
import { AUTHORIZE_ENDPOINT, TOKEN_ENDPOINT, PUBLIC_CLIENT_ID, SCOPES, REDIRECT_PATH, NETWORK_TIMEOUT_MS, isOAuthConfigured } from "./oauth-config.js";
import { buildAuthorizeRequest, parseCallback, isValidRedirectUri } from "./oauth-pkce.js";

export const SESSION_KEY = "fastcrm_oauth_session";

export function validateTokenResponse(body, now = Date.now()) {
  if (!body || typeof body !== "object") return null;
  const { access_token, token_type, expires_in } = body;
  if (typeof access_token !== "string" || access_token.length < 16 || access_token.length > 8192) return null;
  if (typeof token_type !== "string" || token_type.toLowerCase() !== "bearer") return null;
  if (!Number.isFinite(expires_in) || expires_in <= 0 || expires_in > 86400) return null;
  return { accessToken: access_token, expiresAt: now + expires_in * 1000 };
}

export function createOAuthClient({ chromeApi, fetchImpl = fetch, clientId = PUBLIC_CLIENT_ID, now = () => Date.now() }) {
  const storage = chromeApi.storage.session;

  async function readSession() {
    const data = await storage.get(SESSION_KEY);
    return data?.[SESSION_KEY] ?? null;
  }

  async function status() {
    if (!isOAuthConfigured(clientId)) return "config_pending";
    const s = await readSession();
    if (!s || typeof s.accessToken !== "string" || !Number.isFinite(s.expiresAt) || s.expiresAt - 30000 <= now()) {
      if (s) await storage.remove(SESSION_KEY);
      return "disconnected";
    }
    return "connected";
  }

  async function logout() {
    await storage.remove(SESSION_KEY);
    return "disconnected";
  }

  async function start() {
    if (!isOAuthConfigured(clientId)) return { status: "config_pending" };
    const extensionId = chromeApi.runtime.id;
    const redirectUri = chromeApi.identity.getRedirectURL(REDIRECT_PATH);
    if (!isValidRedirectUri(redirectUri, extensionId)) return { status: await status(), error: "redirect_invalido" };

    const req = await buildAuthorizeRequest({ authorizeEndpoint: AUTHORIZE_ENDPOINT, clientId, redirectUri, scope: SCOPES });
    let callback;
    try {
      callback = await chromeApi.identity.launchWebAuthFlow({ url: req.url, interactive: true });
    } catch {
      return { status: await status(), error: "autorizacao_cancelada" };
    }
    const parsed = parseCallback(callback, { redirectUri, expectedState: req.state });
    if (!parsed.ok) return { status: await status(), error: parsed.error };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    let body;
    try {
      const res = await fetchImpl(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: req.verifier,
          code: parsed.code,
        }).toString(),
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
      });
      if (!res.ok) return { status: await logout(), error: "troca_token_falhou" };
      body = await res.json();
    } catch {
      return { status: await logout(), error: "rede_indisponivel" };
    } finally {
      clearTimeout(timer);
    }
    const session = validateTokenResponse(body, now());
    if (!session) return { status: await logout(), error: "token_invalido" };
    await storage.set({ [SESSION_KEY]: session });
    return { status: "connected" };
  }

  /** Só para uso interno do service worker. Nunca reencaminhar à UI. */
  async function getAccessTokenForServiceWorker() {
    if ((await status()) !== "connected") return null;
    const s = await readSession();
    return s && s.expiresAt - 30000 > now() ? s.accessToken : null;
  }

  return { status, start, logout, getAccessTokenForServiceWorker };
}
