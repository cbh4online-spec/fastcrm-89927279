import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExtensionApi, sanitizeLookup, sanitizeWorkspaces, mapHttpError } from "../lib/extension-api.js";
import { API_ENDPOINT, API_READY, PUBLIC_API_KEY, isLookupReady } from "../lib/oauth-config.js";
import { sanitizeResponse } from "../lib/messages.js";
import { detailUrl, isAllowedUrl } from "../lib/urls.js";
import { createOAuthClient, SESSION_KEY } from "../lib/oauth-client.js";

const WS = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const C1 = "33333333-3333-4333-8333-333333333333";
const TOKEN = "t".repeat(40);
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

test("endpoint fixo e pesquisa bloqueada por omissão", async () => {
  assert.equal(API_ENDPOINT, "https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/fastcrm-whatsapp-extension-api");
  assert.equal(API_READY, true);
  assert.equal(PUBLIC_API_KEY, "");
  assert.equal(isLookupReady(), true, "v0.5.0 piloto ativo");
  assert.equal(isLookupReady({ clientId: "client-123", apiReady: false }), false);
  assert.equal(isLookupReady({ clientId: "client-123", apiReady: true }), true);
  assert.equal(isLookupReady({ clientId: "client-123", apiReady: true, requiresKey: true, publicKey: "" }), false);
  const api = createExtensionApi({ fetchImpl: () => assert.fail("fetch"), getToken: async () => TOKEN });
  assert.deepEqual(await api.listWorkspaces(), { ok: false, error: "sem_permissao_servidor" });
});

test("pedido: POST JSON, sem cookies/redirects, token só no Authorization", async () => {
  let sent;
  const api = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => TOKEN,
    fetchImpl: async (url, init) => { sent = { url, init }; return ok({ workspaces: [{ id: WS.toUpperCase(), name: "<b>X</b>", role: "agent", secret: "s" }, { id: "nao-uuid" }] }); } });
  const r = await api.listWorkspaces();
  assert.equal(sent.url, API_ENDPOINT);
  assert.equal(sent.init.method, "POST");
  assert.equal(sent.init.credentials, "omit");
  assert.equal(sent.init.redirect, "error");
  assert.equal(sent.init.cache, "no-store");
  assert.equal(sent.init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(sent.init.headers.apikey, undefined);
  assert.deepEqual(JSON.parse(sent.init.body), { action: "workspaces" });
  assert.deepEqual(r, { ok: true, workspaces: [{ id: WS, name: "<b>X</b>", role: "agent" }] });
});

test("desligado ou token expirado não chama a rede", async () => {
  const api = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => null, fetchImpl: () => assert.fail("fetch") });
  assert.deepEqual(await api.listWorkspaces(), { ok: false, error: "desligado" });
  const store = { [SESSION_KEY]: { accessToken: TOKEN, expiresAt: 1000 + 20000 } };
  const chromeApi = { runtime: { id: "x" }, permissions: { contains: async () => true }, storage: { session: { get: async (k) => ({ [k]: store[k] }), remove: async (k) => { delete store[k]; }, set: async () => {} } } };
  const client = createOAuthClient({ chromeApi, clientId: "client-123", now: () => 1000 });
  assert.equal(await client.getAccessTokenForServiceWorker(), null);
});

test("lookup: workspace fora da lista recebida, telefone inválido, sem rede", async () => {
  const api = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => TOKEN, fetchImpl: () => assert.fail("fetch") });
  const allowed = new Set([WS]);
  assert.equal((await api.lookup(OTHER, "912345678", allowed)).error, "workspace_invalido");
  assert.equal((await api.lookup(WS, "abc", allowed)).error, "telefone_invalido");
  assert.equal((await api.lookup(WS, "9".repeat(41), allowed)).error, "telefone_invalido");
});

test("lookup: normaliza, limita a 10, remove campos e registos de outro workspace", async () => {
  let body;
  const rows = Array.from({ length: 15 }, (_, i) => ({ id: `33333333-3333-4333-8333-${String(i).padStart(12, "0")}`, workspace_id: WS, name: "N", phone: "+351912345678", company: "Co", email: "a@b", notes: "x" }));
  const api = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => TOKEN,
    fetchImpl: async (_u, init) => { body = JSON.parse(init.body); return ok({ workspace_id: WS, contacts: [...rows, { id: C1, workspace_id: OTHER, name: "Y" }], leads: [{ id: C1, workspace_id: WS, name: "L", status: "new" }] }); } });
  const r = await api.lookup(WS, "912 345 678", new Set([WS]));
  assert.deepEqual(body, { action: "lookup", workspace_id: WS, phone: "+351912345678" });
  assert.equal(r.contacts.length, 10);
  assert.equal(JSON.stringify(r).includes("a@b"), false);
  assert.equal(JSON.stringify(r).includes(OTHER), false);
  assert.equal(r.leads[0].status, "new");
  assert.equal(sanitizeLookup({ workspace_id: OTHER, contacts: [], leads: [] }, WS), null);
  assert.equal(sanitizeWorkspaces({}), null);
});

test("códigos HTTP mapeados sem confundir com zero resultados", async () => {
  for (const [code, err] of [[401, "sessao_expirada"], [403, "acesso_negado"], [409, "instancia_nao_suportada"], [429, "limite_excedido"], [503, "servico_desativado"], [500, "erro_servico"]]) {
    assert.equal(mapHttpError(code), err);
    const api = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => TOKEN, fetchImpl: async () => ({ ok: false, status: code }) });
    assert.equal((await api.listWorkspaces()).error, err);
  }
  const net = createExtensionApi({ ready: () => true, hasAccess: async () => true, getToken: async () => TOKEN, fetchImpl: async () => { throw new Error("x"); } });
  assert.equal((await net.listWorkspaces()).error, "rede_indisponivel");
});

test("resposta à UI: só campos allowlisted, sem tokens", () => {
  const r = sanitizeResponse({ ok: true, accessToken: TOKEN, refresh_token: "r", contacts: [{ id: C1, name: "A", phone: "1", company: "C", token: "x" }], leads: [] }, "CONTACT_LOOKUP");
  assert.deepEqual(r, { ok: true, contacts: [{ id: C1, name: "A", phone: "1", company: "C" }], leads: [] });
  assert.deepEqual(sanitizeResponse({ ok: true, contacts: [{ id: C1 }], leads: [] }, "AUTH_STATUS"), { ok: true });
});

test("abrir ficha: só UUID, origem fixa, sem query/hash nem outras rotas", () => {
  assert.equal(detailUrl("contacts", C1), `https://fastcrm.metodopare.ai/dashboard/contacts/${C1}`);
  assert.equal(isAllowedUrl(detailUrl("leads", C1)), true);
  for (const bad of [detailUrl("users", C1), detailUrl("contacts", "../x"), detailUrl("contacts", `${C1}?a=1`)]) assert.equal(bad, null);
  assert.equal(isAllowedUrl(`https://fastcrm.metodopare.ai/dashboard/contacts/${C1}?phone=1`), false);
  assert.equal(isAllowedUrl(`https://fastcrm.metodopare.ai/dashboard/contacts/${C1}/edit`), false);
  assert.equal(isAllowedUrl(`https://fastcrm.metodopare.ai/dashboard/settings/${C1}`), false);
  assert.equal(isAllowedUrl(`https://evil.com/dashboard/contacts/${C1}`), false);
});

test("painel: sem innerHTML, sem persistência, sem logs de PII", () => {
  const js = readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|localStorage|chrome\.storage|console\./);
  assert.match(js, /nonce !== state\.nonce/);
});
