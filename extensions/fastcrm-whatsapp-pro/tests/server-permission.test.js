import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requestServerAccess, hasServerAccess, migrateSafeState, isServerOriginRemoval, SERVER_ORIGIN_PATTERN } from "../lib/server-permission.js";
import { createOAuthClient, SESSION_KEY } from "../lib/oauth-client.js";
import { createExtensionApi } from "../lib/extension-api.js";
import { createHandler } from "../lib/sw-handlers.js";

const EXT = "abcdefghijklmnopabcdefghijklmnop";
const REDIRECT = `https://${EXT}.chromiumapp.org/oauth2`;
const CLIENT = "client-test-123";
const TOKEN = "t".repeat(40);
const WS = "11111111-1111-4111-8111-111111111111";
const deferred = () => { let resolve; const p = new Promise((r) => (resolve = r)); return { p, resolve }; };
const tick = () => new Promise((r) => setImmediate(r));
const until = async (f) => { for (let i = 0; i < 200 && !f(); i++) await tick(); assert.ok(f(), "condição não atingida"); };

test("manifest: host obrigatório ausente, opcional exato, CSP inalterada", () => {
  const m = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  assert.equal(m.host_permissions, undefined);
  assert.deepEqual(m.optional_host_permissions, [SERVER_ORIGIN_PATTERN]);
  assert.equal(SERVER_ORIGIN_PATTERN, "https://eumnfkccyvlyoyjchiwe.supabase.co/*");
  assert.deepEqual(m.permissions, ["storage", "sidePanel", "identity"]);
  assert.equal(m.optional_permissions, undefined);
});

test("oauth-config v0.5.0: client_id piloto e API_READY=true", () => {
  const cfg = readFileSync(new URL("../lib/oauth-config.js", import.meta.url), "utf8");
  assert.ok(cfg.includes('export const PUBLIC_CLIENT_ID = "e3797d42-b91a-4872-8a42-fca687486725";\n'));
  assert.ok(cfg.includes("export const API_READY = true;\n"));
});

test("requestServerAccess: chamada síncrona; concessão/recusa/rejeição/exceção/API ausente", async () => {
  let called = 0;
  const p = requestServerAccess({ permissions: { request: (a) => { called++; assert.deepEqual(a, { origins: [SERVER_ORIGIN_PATTERN] }); return Promise.resolve(true); } } });
  assert.equal(called, 1, "request invocado antes de qualquer await");
  assert.equal(await p, true);
  assert.equal(await requestServerAccess({ permissions: { request: async () => false } }), false);
  assert.equal(await requestServerAccess({ permissions: { request: () => Promise.reject(new Error("x")) } }), false);
  assert.equal(await requestServerAccess({ permissions: { request: () => { throw new Error("x"); } } }), false);
  assert.equal(await requestServerAccess({}), false);
  assert.equal(await requestServerAccess(undefined), false);
  assert.equal(await requestServerAccess({ permissions: { request: async () => "sim" } }), false, "só true conta");
});

test("hasServerAccess falha fechada", async () => {
  assert.equal(await hasServerAccess({ permissions: { contains: async () => true } }), true);
  assert.equal(await hasServerAccess({ permissions: { contains: async () => { throw new Error(); } } }), false);
  assert.equal(await hasServerAccess({}), false);
  assert.equal(isServerOriginRemoval({ origins: [SERVER_ORIGIN_PATTERN] }), true);
  assert.equal(isServerOriginRemoval({ permissions: ["storage"] }), false);
});

function perms({ granted = true, removeResult = true, removeThrows = false } = {}) {
  const calls = [];
  let g = granted;
  return { calls, permissions: {
    contains: async () => { calls.push("contains"); return g; },
    remove: async (a) => { calls.push(["remove", a]); if (removeThrows) throw new Error("x"); if (removeResult) g = false; return removeResult; },
  } };
}

test("migração: remove só no estado seguro; nunca numa build configurada", async () => {
  const safe = perms();
  assert.equal(await migrateSafeState(safe, { clientId: "", apiReady: false }), "removed");
  assert.deepEqual(safe.calls[1], ["remove", { origins: [SERVER_ORIGIN_PATTERN] }]);
  assert.equal(await migrateSafeState(perms({ granted: false }), { clientId: "", apiReady: false }), "not_granted");
  assert.equal(await migrateSafeState(perms({ removeResult: false }), { clientId: "", apiReady: false }), "remove_failed");
  assert.equal(await migrateSafeState(perms({ removeThrows: true }), { clientId: "", apiReady: false }), "remove_failed");
  assert.equal(await migrateSafeState({}, { clientId: "", apiReady: false }), "unavailable");
  for (const opts of [{ clientId: CLIENT, apiReady: false }, { clientId: "", apiReady: true }, { clientId: CLIENT, apiReady: true }]) {
    const c = perms();
    assert.equal(await migrateSafeState(c, opts), "skipped_configured");
    assert.deepEqual(c.calls, [], "build configurada: zero chamadas");
  }
});

function oauthHarness({ access }) {
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
      set: async (o) => Object.assign(store, o),
      remove: async (k) => { delete store[k]; },
    } },
  };
  const fetchImpl = () => { const d = deferred(); fetches.push(d); return d.p; };
  const oauth = createOAuthClient({ chromeApi, fetchImpl, clientId: CLIENT, hasAccess: access });
  return { store, launches, fetches, oauth };
}
const okToken = (d) => d.resolve({ ok: true, json: async () => ({ access_token: TOKEN, token_type: "bearer", expires_in: 3600 }) });

test("SW sem permissão: AUTH_START direto não abre OAuth nem faz fetch", async () => {
  const h = oauthHarness({ access: async () => false });
  const r = await h.oauth.start();
  assert.equal(r.error, "sem_permissao_servidor");
  assert.equal(h.launches.length, 0);
  assert.equal(h.fetches.length, 0);
  assert.equal(await h.oauth.status(), "disconnected");
});

test("revogação durante contains() inicial: logout invalida a tentativa", async () => {
  const gate = deferred();
  const h = oauthHarness({ access: () => gate.p });
  const p = h.oauth.start();
  await h.oauth.logout();
  gate.resolve(true);
  assert.equal((await p).error, "sessao_alterada");
  assert.equal(h.launches.length, 0);
});

test("revogação durante callback OAuth: sem troca de token", async () => {
  let granted = true;
  const h = oauthHarness({ access: async () => granted });
  const p = h.oauth.start();
  await until(() => h.launches.length === 1);
  granted = false;
  h.launches[0].resolve(`${REDIRECT}?code=abcdefgh12&state=${h.launches[0].state}`);
  const r = await p;
  assert.equal(r.error, "sem_permissao_servidor");
  assert.equal(h.fetches.length, 0);
  assert.equal(SESSION_KEY in h.store, false);
});

test("revogação (onRemoved => logout) durante troca de token: token descartado", async () => {
  const h = oauthHarness({ access: async () => true });
  const p = h.oauth.start();
  await until(() => h.launches.length === 1);
  h.launches[0].resolve(`${REDIRECT}?code=abcdefgh12&state=${h.launches[0].state}`);
  await until(() => h.fetches.length === 1);
  await h.oauth.logout();
  okToken(h.fetches[0]);
  assert.equal((await p).error, "sessao_alterada");
  assert.equal(SESSION_KEY in h.store, false);
});

test("permissão retirada após ligação: status desligado e token apagado", async () => {
  let granted = true;
  const h = oauthHarness({ access: async () => granted });
  const p = h.oauth.start();
  await until(() => h.launches.length === 1);
  h.launches[0].resolve(`${REDIRECT}?code=abcdefgh12&state=${h.launches[0].state}`);
  await until(() => h.fetches.length === 1);
  okToken(h.fetches[0]);
  assert.equal((await p).status, "connected");
  granted = false;
  assert.equal(await h.oauth.getAccessTokenForServiceWorker(), null);
  assert.equal(SESSION_KEY in h.store, false);
});

test("API: sem permissão => código mapeado e zero fetch; ready() Promise não conta", async () => {
  const noFetch = () => assert.fail("fetch");
  const denied = createExtensionApi({ ready: () => true, getToken: async () => TOKEN, fetchImpl: noFetch, hasAccess: async () => false });
  assert.deepEqual(await denied.listWorkspaces(), { ok: false, error: "sem_permissao_servidor" });
  const dflt = createExtensionApi({ ready: () => true, getToken: async () => TOKEN, fetchImpl: noFetch });
  assert.equal((await dflt.listWorkspaces()).error, "sem_permissao_servidor", "omissão falha fechada");
  const promiseReady = createExtensionApi({ ready: async () => true, getToken: async () => TOKEN, fetchImpl: noFetch, hasAccess: async () => true });
  assert.equal((await promiseReady.listWorkspaces()).error, "api_nao_configurada");
  let n = 0;
  const flips = createExtensionApi({ ready: () => true, getToken: async () => TOKEN, fetchImpl: noFetch, hasAccess: async () => ++n === 1 });
  assert.equal((await flips.listWorkspaces()).error, "sem_permissao_servidor", "revogada durante getToken");
});

test("SW revoke(): limpa workspaces, faz logout e descarta lookup atrasado", async () => {
  const look = deferred();
  let loggedOut = 0;
  const api = { listWorkspaces: async () => ({ ok: true, workspaces: [{ id: WS }] }), lookup: () => look.p };
  const h = createHandler({ oauth: { status: async () => "connected", start: async () => ({ status: "connected" }), logout: async () => { loggedOut++; return "disconnected"; } }, api, openTab: async () => {} });
  await h.handle({ type: "LIST_WORKSPACES" });
  const pending = h.handle({ type: "CONTACT_LOOKUP", workspaceId: WS, phone: "912345678" });
  await h.revoke();
  look.resolve({ ok: true, contacts: [{ id: WS, name: "X" }], leads: [] });
  assert.deepEqual(await pending, { ok: false, error: "sessao_alterada" });
  assert.equal(h._allowedCount(), 0);
  assert.equal(loggedOut, 1);
});

test("background liga onRemoved, migração em install/startup e não pede permissões", () => {
  const bg = readFileSync(new URL("../background.js", import.meta.url), "utf8");
  assert.match(bg, /permissions\?\.onRemoved\?\.addListener/);
  assert.match(bg, /onInstalled\.addListener\(runMigration\)/);
  assert.match(bg, /onStartup\.addListener\(runMigration\)/);
  assert.doesNotMatch(bg, /permissions\.request|requestServerAccess/);
  assert.match(bg, /hasAccess: \(\) => hasServerAccess\(chrome\)/);
});
