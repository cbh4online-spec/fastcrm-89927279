import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { s256Challenge, randomToken, isValidRedirectUri, parseCallback, buildAuthorizeRequest } from "../lib/oauth-pkce.js";
import { createOAuthClient, validateTokenResponse, SESSION_KEY } from "../lib/oauth-client.js";
import { PUBLIC_CLIENT_ID, isOAuthConfigured, AUTHORIZE_ENDPOINT } from "../lib/oauth-config.js";
import { isTrustedSender, isKnownMessage, sanitizeResponse } from "../lib/messages.js";

const EXT = "abcdefghijklmnopabcdefghijklmnop";
const REDIRECT = `https://${EXT}.chromiumapp.org/oauth2`;
const CLIENT = "client-test-123";

function fakeChrome({ callback, launchError } = {}) {
  const store = {};
  return {
    store,
    runtime: { id: EXT },
    permissions: { contains: async () => true },
    identity: {
      getRedirectURL: (p) => `https://${EXT}.chromiumapp.org/${p}`,
      launchWebAuthFlow: async ({ url, interactive }) => {
        assert.equal(interactive, true);
        if (launchError) throw new Error("cancel");
        const state = new URL(url).searchParams.get("state");
        return typeof callback === "function" ? callback(state) : callback;
      },
    },
    storage: { session: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { delete store[k]; },
    } },
  };
}

test("PKCE S256 coincide com RFC 7636 e é base64url sem padding", async () => {
  assert.equal(await s256Challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  const v = randomToken(48);
  assert.match(v, /^[A-Za-z0-9_-]{64}$/);
  assert.notEqual(v, randomToken(48));
  await assert.rejects(s256Challenge("curto"));
  const expected = createHash("sha256").update(v).digest("base64url");
  assert.equal(await s256Challenge(v), expected);
});

test("pedido authorize inclui S256, state e redirect exato", async () => {
  const r = await buildAuthorizeRequest({ authorizeEndpoint: AUTHORIZE_ENDPOINT, clientId: CLIENT, redirectUri: REDIRECT, scope: "openid" });
  const u = new URL(r.url);
  assert.equal(u.origin + u.pathname, "https://eumnfkccyvlyoyjchiwe.supabase.co/auth/v1/oauth/authorize");
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("state"), r.state);
  assert.equal(u.searchParams.get("redirect_uri"), REDIRECT);
  assert.equal(u.searchParams.get("code_challenge"), await s256Challenge(r.verifier));
  await assert.rejects(buildAuthorizeRequest({ authorizeEndpoint: "http://x.test/a", clientId: CLIENT, redirectUri: REDIRECT, scope: "openid" }));
});

test("redirect URI só aceita o formato exato chromiumapp.org/oauth2", () => {
  assert.equal(isValidRedirectUri(REDIRECT, EXT), true);
  for (const bad of [REDIRECT + "/", REDIRECT + "?x=1", `https://evil.com/oauth2`, `http://${EXT}.chromiumapp.org/oauth2`, `https://${EXT}.chromiumapp.org.evil.com/oauth2`]) {
    assert.equal(isValidRedirectUri(bad, EXT), false, bad);
  }
});

test("callback: code válido aceite; error/state/redirect/duplicados recusados", () => {
  const ctx = { redirectUri: REDIRECT, expectedState: "s".repeat(43) };
  assert.deepEqual(parseCallback(`${REDIRECT}?code=abcdefgh12&state=${"s".repeat(43)}`, ctx), { ok: true, code: "abcdefgh12" });
  assert.equal(parseCallback(`${REDIRECT}?error=access_denied&state=${"s".repeat(43)}`, ctx).error, "autorizacao_recusada");
  assert.equal(parseCallback(`${REDIRECT}?code=abcdefgh12&state=outro`, ctx).error, "state_invalido");
  assert.equal(parseCallback(`${REDIRECT}?code=abcdefgh12`, ctx).error, "callback_invalido");
  assert.equal(parseCallback(`${REDIRECT}?code=a1234567&code=b1234567&state=${"s".repeat(43)}`, ctx).error, "callback_invalido");
  assert.equal(parseCallback(`https://evil.com/oauth2?code=abcdefgh12&state=${"s".repeat(43)}`, ctx).error, "redirect_invalido");
  assert.equal(parseCallback("javascript:alert(1)", ctx).error, "redirect_invalido");
  assert.equal(parseCallback(`${REDIRECT}?code=abcdefgh12&state=`, { redirectUri: REDIRECT, expectedState: "" }).error, "state_invalido");
});

test("sem client_id público: estado configuração pendente e sem abrir login", async () => {
  assert.equal(isOAuthConfigured(""), false);
  const c = fakeChrome({ launchError: true });
  const client = createOAuthClient({ chromeApi: c, fetchImpl: () => assert.fail("fetch") });
  assert.equal(await client.status(), "config_pending");
  assert.deepEqual(await client.start(), { status: "config_pending" });
});

test("fluxo completo: troca form-urlencoded, token só em storage.session, resposta sem token", async () => {
  let sent;
  const c = fakeChrome({ callback: (state) => `${REDIRECT}?code=codeabc123&state=${state}` });
  const client = createOAuthClient({ chromeApi: c, clientId: CLIENT, now: () => 1000,
    fetchImpl: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => ({ access_token: "x".repeat(40), token_type: "bearer", expires_in: 3600 }) }; } });
  const r = await client.start();
  assert.deepEqual(r, { status: "connected" });
  assert.equal(sent.url, "https://eumnfkccyvlyoyjchiwe.supabase.co/auth/v1/oauth/token");
  assert.equal(sent.init.headers["Content-Type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(sent.init.body);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "codeabc123");
  assert.equal(body.get("redirect_uri"), REDIRECT);
  assert.match(body.get("code_verifier"), /^[A-Za-z0-9_-]{64}$/);
  assert.equal(body.get("client_secret"), null);
  assert.equal(JSON.stringify(r).includes("xxxx"), false);
  assert.equal(c.store[SESSION_KEY].accessToken.length, 40);
  assert.equal(await client.status(), "connected");
  assert.equal(await client.logout(), "disconnected");
  assert.equal(c.store[SESSION_KEY], undefined);
  assert.equal(await client.status(), "disconnected");
});

test("token inválido, HTTP erro ou expirado nunca resulta em ligado", async () => {
  assert.equal(validateTokenResponse({ access_token: "x".repeat(40), token_type: "mac", expires_in: 60 }), null);
  assert.equal(validateTokenResponse({ access_token: "x", token_type: "bearer", expires_in: 60 }), null);
  assert.equal(validateTokenResponse({ access_token: "x".repeat(40), token_type: "bearer", expires_in: -1 }), null);
  const cb = (state) => `${REDIRECT}?code=codeabc123&state=${state}`;
  const bad = createOAuthClient({ chromeApi: fakeChrome({ callback: cb }), clientId: CLIENT, fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: 1 }) }) });
  assert.equal((await bad.start()).status, "disconnected");
  const http = createOAuthClient({ chromeApi: fakeChrome({ callback: cb }), clientId: CLIENT, fetchImpl: async () => ({ ok: false }) });
  assert.equal((await http.start()).error, "troca_token_falhou");
  let t = 0;
  const c = fakeChrome({ callback: cb });
  const exp = createOAuthClient({ chromeApi: c, clientId: CLIENT, now: () => t, fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: "x".repeat(40), token_type: "Bearer", expires_in: 60 }) }) });
  assert.equal((await exp.start()).status, "connected");
  t = 60000;
  assert.equal(await exp.status(), "disconnected");
  assert.equal(c.store[SESSION_KEY], undefined);
});

test("remetentes não autorizados e respostas sem tokens", () => {
  const url = `chrome-extension://${EXT}/sidepanel.html`;
  assert.equal(isTrustedSender({ id: EXT, url }, EXT), true);
  assert.equal(isTrustedSender({ id: "outro", url }, EXT), false);
  assert.equal(isTrustedSender({ id: EXT, url, tab: { id: 1 } }, EXT), false);
  assert.equal(isTrustedSender({ id: EXT, url: `chrome-extension://${EXT}/outra.html` }, EXT), false);
  assert.equal(isKnownMessage({ type: "GET_TOKEN" }), false);
  assert.deepEqual(sanitizeResponse({ ok: true, status: "connected", accessToken: "s", token: "t" }), { ok: true, status: "connected" });
});

test("pesquisa no painel recusada sem API e sem segredos no código", () => {
  const bg = readFileSync(new URL("../background.js", import.meta.url), "utf8");
  assert.match(readFileSync(new URL("../lib/sw-handlers.js", import.meta.url), "utf8"), /case "CONTACT_LOOKUP":[\s\S]*api\.lookup\(/);
  assert.doesNotMatch(bg, /accessToken/);
  const files = ["background.js", "sidepanel.js", "sidepanel.html", ...readdirSync(new URL("../lib/", import.meta.url)).map((f) => "lib/" + f)];
  for (const f of files) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.doesNotMatch(src, /eyJ[A-Za-z0-9_-]{10,}|client_secret\s*[:=]\s*["'][^"']|service_role|sk_live|chrome\.storage\.(local|sync)|localStorage/, f);
  }
});
