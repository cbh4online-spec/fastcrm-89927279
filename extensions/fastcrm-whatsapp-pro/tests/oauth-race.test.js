import { test } from "node:test";
import assert from "node:assert/strict";
import { createOAuthClient, SESSION_KEY } from "../lib/oauth-client.js";
import { createHandler } from "../lib/sw-handlers.js";
import { isKnownMessage, sanitizeResponse } from "../lib/messages.js";
import { parseCallback } from "../lib/oauth-pkce.js";

const EXT = "abcdefghijklmnopabcdefghijklmnop";
const REDIRECT = `https://${EXT}.chromiumapp.org/oauth2`;
const CLIENT = "client-test-123";
const TOKEN = "tok_" + "x".repeat(40);
const deferred = () => { let resolve, reject; const p = new Promise((r, j) => { resolve = r; reject = j; }); return { p, resolve, reject }; };
const tick = () => new Promise((r) => setTimeout(r, 0));

/** Chrome falso em que o callback e a troca de token ficam pendentes até o teste decidir. */
function harness() {
  const store = {};
  const launches = [];
  const fetches = [];
  const chromeApi = {
    runtime: { id: EXT },
    identity: {
      getRedirectURL: (p) => `https://${EXT}.chromiumapp.org/${p}`,
      launchWebAuthFlow: ({ url }) => { const d = deferred(); launches.push({ state: new URL(url).searchParams.get("state"), ...d }); return d.p; },
    },
    storage: { session: {
      get: async (k) => (k in store ? { [k]: store[k] } : {}),
      set: async (o) => { await tick(); Object.assign(store, o); },
      remove: async (k) => { await tick(); delete store[k]; },
    } },
  };
  const fetchImpl = () => { const d = deferred(); fetches.push(d); return d.p; };
  const oauth = createOAuthClient({ chromeApi, fetchImpl, clientId: CLIENT });
  const okToken = (d, token = TOKEN) => d.resolve({ ok: true, json: async () => ({ access_token: token, token_type: "bearer", expires_in: 3600 }) });
  const callback = (l) => l.resolve(`${REDIRECT}?code=abcdefgh12&state=${l.state}`);
  return { store, launches, fetches, oauth, okToken, callback };
}

test("fluxo normal continua a ligar", async () => {
  const h = harness();
  const p = h.oauth.start();
  await tick(); h.callback(h.launches[0]);
  await tick(); await tick(); h.okToken(h.fetches[0]);
  assert.deepEqual(await p, { status: "connected" });
  assert.equal(await h.oauth.status(), "connected");
});

test("logout durante o callback: sessão nunca é reaberta", async () => {
  const h = harness();
  const p = h.oauth.start();
  await tick();
  assert.equal(await h.oauth.logout(), "disconnected");
  h.callback(h.launches[0]);
  const r = await p;
  assert.equal(r.status, "disconnected");
  assert.equal(r.error, "sessao_alterada");
  assert.equal(h.fetches.length, 0, "não troca código após logout");
  assert.equal(SESSION_KEY in h.store, false);
});

test("logout durante a troca de token lenta: token descartado", async () => {
  const h = harness();
  const p = h.oauth.start();
  await tick(); h.callback(h.launches[0]);
  await tick(); await tick();
  assert.equal(h.fetches.length, 1);
  await h.oauth.logout();
  h.okToken(h.fetches[0]);
  const r = await p;
  assert.equal(r.error, "sessao_alterada");
  assert.equal(SESSION_KEY in h.store, false);
  assert.equal(await h.oauth.status(), "disconnected");
  assert.equal(await h.oauth.getAccessTokenForServiceWorker(), null);
});

test("logout concorrente com a escrita do token: estado final desligado", async () => {
  const h = harness();
  const p = h.oauth.start();
  await tick(); h.callback(h.launches[0]);
  await tick(); await tick();
  h.okToken(h.fetches[0]);
  // Interleavings: logout em vários pontos à volta do storage.set.
  for (let i = 0; i < 3; i++) await tick();
  const lo = h.oauth.logout();
  await Promise.all([p, lo]);
  assert.equal(SESSION_KEY in h.store, false);
  assert.equal(await h.oauth.status(), "disconnected");
});

test("AUTH_START simultâneo é recusado e não toca no primeiro", async () => {
  const h = harness();
  const p1 = h.oauth.start();
  await tick();
  const r2 = await h.oauth.start();
  assert.equal(r2.error, "login_em_curso");
  assert.equal(h.launches.length, 1);
  h.callback(h.launches[0]);
  await tick(); await tick(); h.okToken(h.fetches[0]);
  assert.deepEqual(await p1, { status: "connected" });
});

test("tentativa antiga lenta não sobrepõe login novo após logout", async () => {
  const h = harness();
  const old = h.oauth.start();
  await tick(); h.callback(h.launches[0]);
  await tick(); await tick();
  await h.oauth.logout();
  const fresh = h.oauth.start();
  await tick(); h.callback(h.launches[1]);
  await tick(); await tick();
  h.okToken(h.fetches[1], "tok_new_" + "y".repeat(40));
  assert.deepEqual(await fresh, { status: "connected" });
  h.okToken(h.fetches[0], "tok_old_" + "z".repeat(40));
  assert.equal((await old).error, "sessao_alterada");
  assert.match(h.store[SESSION_KEY].accessToken, /^tok_new_/);
});

test("cancelamento e falha de troca deixam desligado", async () => {
  const h = harness();
  const p = h.oauth.start();
  await tick(); h.launches[0].reject(new Error("cancel"));
  assert.equal((await p).error, "autorizacao_cancelada");
  const p2 = h.oauth.start();
  await tick(); h.callback(h.launches[1]);
  await tick(); await tick(); h.fetches[0].resolve({ ok: false });
  assert.deepEqual(await p2, { status: "disconnected", error: "troca_token_falhou" });
});

test("handler: logout durante AUTH_START não deixa workspaces nem token na UI", async () => {
  const h = harness();
  const api = { listWorkspaces: async () => ({ ok: true, workspaces: [{ id: "11111111-1111-4111-8111-111111111111", name: "A", role: "owner" }] }), lookup: async () => ({ ok: true, contacts: [], leads: [] }) };
  const sw = createHandler({ oauth: h.oauth, api, openTab: async () => {} });
  const start = sw.handle({ type: "AUTH_START" });
  await tick();
  await sw.handle({ type: "AUTH_LOGOUT" });
  h.callback(h.launches[0]);
  const r = sanitizeResponse(await start, "AUTH_START");
  assert.equal(r.ok, false);
  assert.equal(sw._allowedCount(), 0);
  assert.equal(JSON.stringify(r).includes("tok_"), false);
  assert.equal((await sw.handle({ type: "AUTH_STATUS" })).status, "disconnected");
});

test("GET_TOKEN e similares nunca são mensagens aceites; respostas sem token", () => {
  for (const type of ["GET_TOKEN", "get_token", "TOKEN", "ACCESS_TOKEN"]) assert.equal(isKnownMessage({ type }), false);
  const out = sanitizeResponse({ ok: true, status: "connected", accessToken: TOKEN, access_token: TOKEN }, "AUTH_STATUS");
  assert.deepEqual(out, { ok: true, status: "connected" });
});

test("callback com path alterado é recusado", () => {
  const st = "s".repeat(43);
  assert.equal(parseCallback(`https://${EXT}.chromiumapp.org/oauth3?code=abcdefgh12&state=${st}`, { redirectUri: REDIRECT, expectedState: st }).ok, false);
  assert.equal(parseCallback(`https://u:p@${EXT}.chromiumapp.org/oauth2?code=abcdefgh12&state=${st}`, { redirectUri: REDIRECT, expectedState: st }).ok, false);
});
