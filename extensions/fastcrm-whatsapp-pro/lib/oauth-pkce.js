/**
 * PKCE (RFC 7636, S256) + validação de callback. Sem dependências; usa Web Crypto.
 */
export function base64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function s256Challenge(verifier) {
  if (typeof verifier !== "string" || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) {
    throw new Error("code_verifier inválido");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Redirect permitido: exatamente https://<id>.chromiumapp.org/oauth2 */
export function isValidRedirectUri(uri, extensionId) {
  if (typeof uri !== "string" || typeof extensionId !== "string" || !/^[a-p]{32}$/.test(extensionId)) return false;
  return uri === `https://${extensionId}.chromiumapp.org/oauth2`;
}

export async function buildAuthorizeRequest({ authorizeEndpoint, clientId, redirectUri, scope }) {
  const endpoint = new URL(authorizeEndpoint);
  if (endpoint.protocol !== "https:") throw new Error("HTTPS obrigatório");
  const state = randomToken(32);
  const verifier = randomToken(48); // 64 caracteres
  const challenge = await s256Challenge(verifier);
  endpoint.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return { url: endpoint.toString(), state, verifier };
}

/**
 * Valida o URL de retorno. Devolve { ok, code } ou { ok:false, error }.
 * Rejeita: origem/caminho diferente, error=, state em falta/diferente, code em falta/repetido.
 */
export function parseCallback(callbackUrl, { redirectUri, expectedState }) {
  let url;
  try { url = new URL(callbackUrl); } catch { return { ok: false, error: "callback_invalido" }; }
  const expected = new URL(redirectUri);
  if (url.protocol !== "https:" || url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password) {
    return { ok: false, error: "redirect_invalido" };
  }
  const p = url.searchParams;
  if (p.has("error")) return { ok: false, error: "autorizacao_recusada" };
  if (p.getAll("state").length !== 1 || p.getAll("code").length !== 1) return { ok: false, error: "callback_invalido" };
  const state = p.get("state");
  if (!expectedState || state !== expectedState) return { ok: false, error: "state_invalido" };
  const code = p.get("code");
  if (!/^[A-Za-z0-9\-._~]{8,512}$/.test(code)) return { ok: false, error: "code_invalido" };
  return { ok: true, code };
}
