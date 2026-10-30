// Revisão independente v0.4.3: corridas de PKCE/UI e migração estrita. Sem rede.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createOAuthClient, SESSION_KEY } from "../lib/oauth-client.js";
import { requestServerAccess, isServerOriginRemoval, migrateSafeState, SERVER_ORIGIN_PATTERN } from "../lib/server-permission.js";

const deferred = () => { let resolve, reject; const p = new Promise((r, j) => { resolve = r; reject = j; }); return { p, resolve, reject }; };
const tick = () => new Promise((r) => setTimeout(r, 0));
const until = async (fn) => { for (let i = 0; i < 500 && !fn(); i++) await tick(); assert.ok(fn(), "estado esperado não atingido"); };
const EXT = "abcdefghijklmnopabcdefghijklmnop";

// ---------- 1) digest PKCE retido ----------
for (const scenario of ["logout", "revogacao", "ambos"]) {
  test(`PKCE: ${scenario} durante crypto.subtle.digest => zero launch/fetch/token`, async () => {
    const original = Object.getOwnPropertyDescriptor(crypto.subtle, "digest");
    const held = deferred();
    let digestCalls = 0;
    const realDigest = SubtleCrypto.prototype.digest;
    Object.defineProperty(crypto.subtle, "digest", { configurable: true, writable: true, value: async (...a) => { digestCalls++; await held.p; return realDigest.apply(crypto.subtle, a); } });
    try {
      let granted = true;
      const launches = []; const fetches = []; const store = {};
      const chromeApi = {
        runtime: { id: EXT },
        permissions: { contains: async () => granted },
        identity: { getRedirectURL: (p) => `https://${EXT}.chromiumapp.org/${p}`, launchWebAuthFlow: async (o) => { launches.push(o); return "x"; } },
        storage: { session: { get: async (k) => (k in store ? { [k]: store[k] } : {}), set: async (o) => Object.assign(store, o), remove: async (k) => { delete store[k]; } } },
      };
      const oauth = createOAuthClient({ chromeApi, fetchImpl: async (...a) => { fetches.push(a); throw new Error("rede"); }, clientId: "client-test-123" });
      const p = oauth.start();
      await until(() => digestCalls > 0);
      if (scenario !== "logout") granted = false;
      if (scenario !== "revogacao") await oauth.logout();
      held.resolve();
      const r = await p;
      assert.equal(r.status, "disconnected");
      assert.equal(launches.length, 0, "nenhuma janela OAuth aberta");
      assert.equal(fetches.length, 0);
      assert.equal(SESSION_KEY in store, false);
    } finally {
      if (original) Object.defineProperty(crypto.subtle, "digest", original); else delete crypto.subtle.digest;
    }
  });
}

// ---------- 2) UI real do painel ----------
const source = readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8").replace(/^import .*;\r?$/gm, "");

function panel({ lookupReady = true } = {}) {
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, { id, disabled: false, hidden: false, value: "", textContent: "", className: "", children: [], listeners: new Map(),
      replaceChildren(...c) { this.children = c; }, addEventListener(t, h) { this.listeners.set(t, h); } });
    return elements.get(id);
  };
  const pending = { AUTH_STATUS: [], AUTH_START: [], AUTH_LOGOUT: [], LIST_WORKSPACES: [], CONTACT_LOOKUP: [] };
  const requests = [];
  const sent = [];
  let removed = null;
  const ctx = vm.createContext({
    document: { getElementById: el, addEventListener() {} },
    Option: function (text, value) { this.text = text; this.value = value; },
    isOAuthConfigured: () => true, isLookupReady: () => lookupReady,
    requestServerAccess, isServerOriginRemoval,
    chrome: {
      permissions: { request() { const d = deferred(); requests.push(d); return d.p; }, onRemoved: { addListener(fn) { removed = fn; } } },
      runtime: { lastError: null, sendMessage(m, cb) { sent.push(m.type); pending[m.type].push(cb); } },
    },
  });
  vm.runInContext(source, ctx);
  vm.runInContext("setupPermissionWatch(); setupPanelLookup();", ctx);
  const setup = vm.runInContext("setupAuth()", ctx);
  const click = (id) => { const ev = { currentTarget: el(id) }; const r = el(id).listeners.get("click")(ev); ev.currentTarget = null; return Promise.resolve(r); };
  const revoke = () => removed({ origins: [SERVER_ORIGIN_PATTERN] });
  const st = (expr) => vm.runInContext(expr, ctx);
  return { el, pending, requests, sent, setup, click, revoke, st };
}

test("UI: revogação com AUTH_START pendente => resposta connected tardia descartada", async () => {
  const h = panel();
  h.pending.AUTH_STATUS.shift()({ status: "disconnected" }); await h.setup;
  const done = h.click("btn-auth-login");
  h.requests[0].resolve(true); await until(() => h.pending.AUTH_START.length);
  h.revoke();
  h.pending.AUTH_START.shift()({ status: "connected" }); await done;
  assert.equal(h.st("state.authStatus"), "disconnected");
  assert.equal(h.el("panel-lookup").hidden, true);
  assert.equal(h.el("btn-auth-login").disabled, false);
});

test("UI: revogação com pedido de permissão pendente => sem AUTH_START após grant antigo", async () => {
  const h = panel();
  h.pending.AUTH_STATUS.shift()({ status: "disconnected" }); await h.setup;
  const done = h.click("btn-auth-login");
  h.revoke();
  h.requests[0].resolve(true); await done; await tick();
  assert.equal(h.sent.includes("AUTH_START"), false);
  assert.equal(h.st("state.authStatus"), "disconnected");
});

test("UI: logout durante pedido de permissão => grant antigo não inicia AUTH_START", async () => {
  const h = panel();
  h.pending.AUTH_STATUS.shift()({ status: "connected" }); await h.setup;
  const done = h.click("btn-auth-login");
  const out = h.click("btn-auth-logout");
  h.requests[0].resolve(true); await done; await tick();
  assert.equal(h.sent.includes("AUTH_START"), false);
  h.pending.AUTH_LOGOUT.shift()({ status: "disconnected" }); await out;
  assert.equal(h.st("state.authStatus"), "disconnected");
});

test("UI: estado inicial pendente + revogação => status connected antigo descartado; listeners ativos", async () => {
  const h = panel();
  assert.ok(h.el("btn-auth-login").listeners.has("click"), "listeners antes do estado inicial");
  h.revoke();
  h.pending.AUTH_STATUS.shift()({ status: "connected" }); await h.setup;
  assert.equal(h.st("state.authStatus"), "disconnected");
  assert.equal(h.el("panel-lookup").hidden, true);
});

test("UI: login vs logout fora de ordem — logout ganha; botão da nova tentativa não é reativado pela antiga", async () => {
  const h = panel();
  h.pending.AUTH_STATUS.shift()({ status: "disconnected" }); await h.setup;
  const first = h.click("btn-auth-login");
  h.requests[0].resolve(true); await until(() => h.pending.AUTH_START.length === 1);
  h.revoke(); // liberta botão
  const second = h.click("btn-auth-login"); // nova tentativa, dona do botão
  assert.equal(h.el("btn-auth-login").disabled, true);
  h.pending.AUTH_START.shift()({ status: "connected" }); await first;
  assert.equal(h.el("btn-auth-login").disabled, true, "tentativa antiga não reativa o botão da nova");
  assert.equal(h.st("state.authStatus"), "disconnected");
  h.requests[1].resolve(true); await until(() => h.pending.AUTH_START.length === 1);
  h.pending.AUTH_START.shift()({ status: "connected" }); await second;
  assert.equal(h.st("state.authStatus"), "connected");
  assert.equal(h.el("btn-auth-login").disabled, false);
  const out = h.click("btn-auth-logout");
  h.pending.AUTH_LOGOUT.shift()({ status: "disconnected" }); await out;
  assert.equal(h.st("state.authStatus"), "disconnected");
});

for (const kind of ["revogacao", "logout"]) {
  test(`UI: LIST_WORKSPACES tardio após ${kind} não reabre o seletor`, async () => {
    const h = panel();
    h.pending.AUTH_STATUS.shift()({ status: "connected" }); await h.setup;
    const load = h.click("btn-load-workspaces");
    if (kind === "revogacao") h.revoke();
    else { h.click("btn-auth-logout"); h.pending.AUTH_LOGOUT.shift()({ status: "disconnected" }); await tick(); }
    h.pending.LIST_WORKSPACES.shift()({ ok: true, workspaces: [{ id: "w1", name: "Antigo" }] }); await load;
    assert.equal(h.el("select-workspace").disabled, true);
    assert.equal(h.el("select-workspace").children.some((o) => o.value === "w1"), false);
  });
}

// ---------- 3) migração estrita ----------
function perms() {
  const calls = [];
  let g = true;
  return { calls, permissions: { contains: async () => { calls.push("contains"); return g; }, remove: async () => { calls.push("remove"); g = false; return true; } } };
}
test("migração: só clientId === \"\" e apiReady === false removem; tudo o resto falha fechado", async () => {
  const bad = [
    { clientId: "bad", apiReady: false }, { clientId: " ", apiReady: false }, { clientId: "x".repeat(300), apiReady: false },
    { clientId: null, apiReady: false }, { clientId: undefined, apiReady: false }, { clientId: 0, apiReady: false },
    { clientId: "", apiReady: undefined }, { clientId: "", apiReady: null }, { clientId: "", apiReady: 0 }, { clientId: "", apiReady: "false" },
  ];
  for (const opts of bad) {
    const c = perms();
    assert.equal(await migrateSafeState(c, opts), "skipped_configured", JSON.stringify(opts));
    assert.deepEqual(c.calls, []);
  }
  for (const opts of [null, "x", 1]) assert.equal(await migrateSafeState(perms(), opts), "skipped_configured");
  assert.equal(await migrateSafeState(perms(), { clientId: "", apiReady: false }), "removed");
  assert.equal(await migrateSafeState(perms()), "skipped_configured", "v0.5.0: build configurada nunca remove");
});

// ---------- 4) padrão exato ----------
test("onRemoved: só o padrão exato declarado conta", () => {
  assert.equal(isServerOriginRemoval({ origins: [SERVER_ORIGIN_PATTERN] }), true);
  for (const o of ["https://eumnfkccyvlyoyjchiwe.supabase.co/", "https://*.supabase.co/*", "<all_urls>", "https://eumnfkccyvlyoyjchiwe.supabase.co.evil.test/*"]) {
    assert.equal(isServerOriginRemoval({ origins: [o] }), false, o);
  }
});
