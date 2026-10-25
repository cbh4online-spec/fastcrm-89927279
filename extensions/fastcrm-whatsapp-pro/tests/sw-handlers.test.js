import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../lib/sw-handlers.js";
import { parseCallback, oauthRedirectUri } from "../lib/oauth-pkce.js";

const WS = "11111111-1111-4111-8111-111111111111";
const deferred = () => { let resolve; const p = new Promise((r) => (resolve = r)); return { p, resolve }; };
const oauth = (over = {}) => ({ status: async () => "connected", start: async () => ({ status: "connected" }), logout: async () => "disconnected", ...over });

test("AUTH_START, AUTH_LOGOUT e 401 limpam workspaces permitidos", async () => {
  let seen;
  const api = { listWorkspaces: async () => ({ ok: true, workspaces: [{ id: WS }] }), lookup: async (_w, _p, allowed) => { seen = allowed.size; return { ok: true, contacts: [], leads: [] }; } };
  for (const type of ["AUTH_START", "AUTH_LOGOUT"]) {
    const h = createHandler({ oauth: oauth(), api, openTab: async () => {} });
    await h.handle({ type: "LIST_WORKSPACES" });
    assert.equal(h._allowedCount(), 1);
    await h.handle({ type });
    assert.equal(h._allowedCount(), 0, type);
    await h.handle({ type: "CONTACT_LOOKUP", workspaceId: WS, phone: "912345678" });
    assert.equal(seen, 0);
  }
  let loggedOut = false;
  const h = createHandler({ oauth: oauth({ logout: async () => { loggedOut = true; return "disconnected"; } }), api: { ...api, lookup: async () => ({ ok: false, error: "sessao_expirada" }) }, openTab: async () => {} });
  await h.handle({ type: "LIST_WORKSPACES" });
  await h.handle({ type: "CONTACT_LOOKUP", workspaceId: WS, phone: "912345678" });
  assert.equal(h._allowedCount(), 0);
  assert.equal(loggedOut, true);
});

test("respostas atrasadas de sessão anterior são descartadas", async () => {
  const d = deferred();
  const look = deferred();
  const api = { listWorkspaces: () => d.p, lookup: () => look.p };
  const h = createHandler({ oauth: oauth(), api, openTab: async () => {} });
  const pending = h.handle({ type: "LIST_WORKSPACES" });
  await h.handle({ type: "AUTH_LOGOUT" });
  d.resolve({ ok: true, workspaces: [{ id: WS }] });
  assert.deepEqual(await pending, { ok: false, error: "sessao_alterada" });
  assert.equal(h._allowedCount(), 0);
  const pl = h.handle({ type: "CONTACT_LOOKUP", workspaceId: WS, phone: "912345678" });
  await h.handle({ type: "AUTH_START" });
  look.resolve({ ok: true, contacts: [{ id: "x", name: "Antigo" }], leads: [] });
  assert.deepEqual(await pl, { ok: false, error: "sessao_alterada" });
});

test("OPEN_TAB fora da allowlist recusado", async () => {
  let opened = 0;
  const h = createHandler({ oauth: oauth(), api: {}, openTab: async () => { opened++; } });
  assert.equal((await h.handle({ type: "OPEN_TAB", url: "https://evil.com/" })).ok, false);
  assert.equal(opened, 0);
});

test("callback com fragmento # ou state/code duplicados é recusado", () => {
  const R = "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/oauth2";
  const st = "s".repeat(43);
  const ctx = { redirectUri: R, expectedState: st };
  assert.equal(parseCallback(`${R}?code=abcdefgh12&state=${st}#x`, ctx).ok, false);
  assert.equal(parseCallback(`${R}?code=abcdefgh12&state=${st}#`, ctx).ok, false);
  assert.equal(parseCallback(`${R}#code=abcdefgh12&state=${st}`, ctx).ok, false);
  assert.equal(parseCallback(`${R}?code=abcdefgh12&state=${st}&state=${st}`, ctx).ok, false);
  assert.equal(parseCallback(`${R}?code=abcdefgh12&code=abcdefgh12&state=${st}`, ctx).ok, false);
  assert.equal(parseCallback(`${R}?code=abcdefgh12&state=${st}`, ctx).ok, true);
});

test("URI de retorno: formato exato ou null", () => {
  const id = "abcdefghijklmnopabcdefghijklmnop";
  assert.equal(oauthRedirectUri({ runtime: { id }, identity: { getRedirectURL: (p) => `https://${id}.chromiumapp.org/${p}` } }), `https://${id}.chromiumapp.org/oauth2`);
  assert.equal(oauthRedirectUri({ runtime: { id }, identity: { getRedirectURL: () => "https://evil.com/oauth2" } }), null);
  assert.equal(oauthRedirectUri({ runtime: { id } }), null);
  assert.equal(oauthRedirectUri(undefined), null);
});
