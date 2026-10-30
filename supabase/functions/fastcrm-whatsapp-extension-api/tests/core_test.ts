// Testes unitários com mocks (sem rede, sem BD). Teste live está pendente.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  authenticate, bearerToken, createRateLimiter, handleAction, parseBody, phoneVariants, readConfig,
  type ApiConfig, type Deps,
} from "../core.ts";

const WS = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
const CFG: ApiConfig = { enabled: true, clientId: "client-ext-123", allowedOrigin: ORIGIN, supabaseUrl: "https://main.supabase.co", anonKey: "anon", pilotWorkspaceIds: new Set([WS]) };

function deps(over: Partial<Deps> = {}): Deps {
  return {
    getClaims: () => Promise.resolve({ sub: "u1", role: "authenticated", client_id: CFG.clientId, exp: 2000 }),
    getUserId: () => Promise.resolve("u1"),
    listMemberships: () => Promise.resolve([{ workspace_id: WS, role: "agent", name: "A" }, { workspace_id: OTHER, role: "guest", name: "B" }]),
    getMembership: (_u, w) => Promise.resolve(w === WS ? { workspace_id: WS, role: "agent" } : null),
    getInstance: () => Promise.resolve(null),
    findContacts: () => Promise.resolve([{ id: "c1", workspace_id: WS, name: "X", phone: "+351912345678", notes: "secreto" }, { id: "c2", workspace_id: OTHER, name: "Y" }]),
    findLeads: () => Promise.resolve([{ id: "l1", workspace_id: WS, name: "L", phone: "912345678", status: "new", email: "a@b" }]),
    now: () => 1_000_000,
    upsertConversation: () => Promise.resolve("conv1"),
    existingMessageKeys: () => Promise.resolve(new Set<string>()),
    insertMessages: (rows) => Promise.resolve(rows.length),
    touchConversation: () => Promise.resolve(),
    ...over,
  };
}

Deno.test("desativada por omissão / config incompleta => null (503)", () => {
  assertEquals(readConfig(() => undefined), null);
  const env: Record<string, string> = { FASTCRM_WA_EXTENSION_API_ENABLED: "true", FASTCRM_WA_EXTENSION_OAUTH_CLIENT_ID: "client-ext-123", FASTCRM_WA_EXTENSION_ALLOWED_ORIGIN: ORIGIN, SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "k", FASTCRM_WA_EXTENSION_PILOT_WORKSPACE_IDS: WS };
  assert(readConfig((k) => env[k]));
  assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_ALLOWED_ORIGIN: "*" })[k]), null);
  assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_ALLOWED_ORIGIN: "https://evil.com" })[k]), null);
  assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_API_ENABLED: "1" })[k]), null);
  assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_OAUTH_CLIENT_ID: "" })[k]), null);
});

Deno.test("parse: só duas ações, campos extra, telefone e UUID inválidos, tamanho", () => {
  assertEquals(parseBody('{"action":"workspaces"}').ok, true);
  assertEquals(parseBody('{"action":"send"}'), { ok: false, status: 422, error: "invalid_action" });
  assertEquals(parseBody('{"action":"workspaces","x":1}').ok, false);
  assertEquals(parseBody(`{"action":"lookup","workspace_id":"${WS}","phone":"abc"}`), { ok: false, status: 422, error: "invalid_phone" });
  assertEquals(parseBody(`{"action":"lookup","workspace_id":"x","phone":"912345678"}`).ok, false);
  assertEquals(parseBody(`{"action":"lookup","workspace_id":"${WS}","phone":"912345678","token":"t"}`).ok, false);
  assertEquals(parseBody(JSON.stringify({ action: "workspaces", pad: "x".repeat(1100) })).ok, false);
  const r = parseBody(`{"action":"lookup","workspace_id":"${WS}","phone":"912 345 678"}`);
  assert(r.ok && r.action === "lookup");
  if (r.ok && r.action === "lookup") assertEquals(r.variants, ["+351912345678", "00351912345678", "351912345678", "912345678"]);
  assertEquals(phoneVariants("+44 20 7946 0958"), ["+442079460958", "00442079460958", "442079460958"]);
  assertEquals(phoneVariants("351%,phone.ilike.*"), []);
});

Deno.test("auth: token ausente, client_id diferente, expirado, sub divergente", async () => {
  assertEquals(bearerToken(null), null);
  assertEquals(bearerToken("Basic abc"), null);
  assertEquals("status" in await authenticate("t", CFG, deps()), false);
  assertEquals(await authenticate("t", CFG, deps({ getClaims: () => Promise.resolve(null) })), { status: 401, body: { error: "invalid_token" } });
  assertEquals((await authenticate("t", CFG, deps({ getClaims: () => Promise.resolve({ sub: "u1", role: "authenticated", client_id: "outra", exp: 2000 }) })) as { status: number }).status, 403);
  assertEquals((await authenticate("t", CFG, deps({ getClaims: () => Promise.resolve({ sub: "u1", role: "authenticated", exp: 2000 }) })) as { status: number }).status, 403);
  assertEquals((await authenticate("t", CFG, deps({ getClaims: () => Promise.resolve({ sub: "u1", role: "authenticated", client_id: CFG.clientId, exp: 999 }) })) as { status: number }).status, 401);
  assertEquals((await authenticate("t", CFG, deps({ getUserId: () => Promise.resolve("u2") })) as { status: number }).status, 401);
});

Deno.test("workspaces: só membership com crm.read, campos limitados", async () => {
  const r = await handleAction({ ok: true, action: "workspaces" }, "u1", CFG, deps());
  assertEquals(r.body, { workspaces: [{ id: WS, name: "A", role: "agent" }] });
});

Deno.test("lookup: sem membership (incl. super admin) => 403; nunca consulta dados", async () => {
  let queried = false;
  const d = deps({ findContacts: () => { queried = true; return Promise.resolve([]); } });
  const r = await handleAction({ ok: true, action: "lookup", workspaceId: OTHER, variants: ["+351912345678"] }, "u1", CFG, d);
  assertEquals(r.status, 403);
  assertEquals(queried, false);
  const hr = await handleAction({ ok: true, action: "lookup", workspaceId: WS, variants: ["x"] }, "u1", CFG, deps({ getMembership: () => Promise.resolve({ workspace_id: WS, role: "guest" }) }));
  assertEquals(hr.status, 403);
});

Deno.test("lookup: instância externa 409, suspensa 403, erro 503", async () => {
  const req = { ok: true as const, action: "lookup" as const, workspaceId: WS, variants: ["+351912345678"] };
  assertEquals((await handleAction(req, "u1", CFG, deps({ getInstance: () => Promise.resolve({ supabase_url: "https://other.supabase.co", status: "active" }) }))).status, 409);
  assertEquals((await handleAction(req, "u1", CFG, deps({ getInstance: () => Promise.resolve({ supabase_url: CFG.supabaseUrl, status: "suspended" }) }))).status, 403);
  assertEquals((await handleAction(req, "u1", CFG, deps({ getInstance: () => Promise.resolve("error" as const) }))).status, 503);
  assertEquals((await handleAction(req, "u1", CFG, deps({ getInstance: () => Promise.resolve({ supabase_url: CFG.supabaseUrl + "/", status: "active" }) }))).status, 200);
});

Deno.test("lookup: filtra outro workspace, remove campos sensíveis, limite 10", async () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, workspace_id: WS, name: "n" }));
  let limitSeen = 0;
  const r = await handleAction({ ok: true, action: "lookup", workspaceId: WS, variants: ["+351912345678"] }, "u1", CFG,
    deps({ findLeads: (_w, _v, l) => { limitSeen = l; return Promise.resolve(many); } }));
  assertEquals(limitSeen, 10);
  const body = r.body as { contacts: Record<string, unknown>[]; leads: unknown[]; exhaustive: boolean };
  assertEquals(body.contacts.length, 1);
  assertEquals("notes" in body.contacts[0], false);
  assertEquals(body.leads.length, 10);
  assertEquals(body.exhaustive, false);
  assertEquals(JSON.stringify(r.body).includes("a@b"), false);
});

Deno.test("rate limit por utilizador", () => {
  const allow = createRateLimiter(2, 1000);
  assert(allow("u", 0)); assert(allow("u", 1)); assertEquals(allow("u", 2), false); assert(allow("v", 2)); assert(allow("u", 1001));
});

Deno.test("piloto: allowlist obrigatória e válida", () => {
  const env: Record<string, string> = { FASTCRM_WA_EXTENSION_API_ENABLED: "true", FASTCRM_WA_EXTENSION_OAUTH_CLIENT_ID: "client-ext-123", FASTCRM_WA_EXTENSION_ALLOWED_ORIGIN: ORIGIN, SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "k" };
  assertEquals(readConfig((k) => env[k]), null);
  for (const v of ["", " , ", "nao-uuid", `${WS},x`]) assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_PILOT_WORKSPACE_IDS: v })[k]), null);
  assertEquals(readConfig((k) => ({ ...env, FASTCRM_WA_EXTENSION_PILOT_WORKSPACE_IDS: ` ${WS.toUpperCase()} , ${OTHER}` })[k])?.pilotWorkspaceIds.size, 2);
});

Deno.test("piloto: workspace fora da allowlist bloqueado antes de membership/dados", async () => {
  let touched = false;
  const d = deps({ getMembership: () => { touched = true; return Promise.resolve({ workspace_id: OTHER, role: "owner" }); }, findContacts: () => { touched = true; return Promise.resolve([]); } });
  const r = await handleAction({ ok: true, action: "lookup", workspaceId: OTHER, variants: ["+351912345678"] }, "u1", CFG, d);
  assertEquals(r, { status: 403, body: { error: "workspace_not_in_pilot" } });
  assertEquals(touched, false);
  const w = await handleAction({ ok: true, action: "workspaces" }, "u1", CFG, deps({ listMemberships: () => Promise.resolve([{ workspace_id: WS, role: "owner", name: "A" }, { workspace_id: OTHER, role: "owner", name: "B" }]) }));
  assertEquals(w.body, { workspaces: [{ id: WS, name: "A", role: "owner" }] });
});

const syncBody = (msgs: unknown[]) => JSON.stringify({ action: "sync_messages", workspace_id: WS, phone: "912345678", messages: msgs });
const M = (d: string, t: string, at = "2026-10-30T17:00:00Z") => ({ direction: d, text: t, sent_at: at });

Deno.test("sync: valida mensagens e remove duplicados no próprio pedido", () => {
  assertEquals(parseBody(syncBody([])).ok, false);
  assertEquals(parseBody(syncBody([M("sideways", "x")])).ok, false);
  assertEquals(parseBody(syncBody([M("inbound", "x", "nope")])).ok, false);
  const r = parseBody(syncBody([M("inbound", "Olá"), M("inbound", "Olá"), M("outbound", "Olá")]));
  assert(r.ok && r.action === "sync_messages");
  if (r.ok && r.action === "sync_messages") { assertEquals(r.messages.length, 2); assertEquals(r.e164, "+351912345678"); }
});

Deno.test("sync: só grava mensagens novas e liga ao contacto", async () => {
  const p = parseBody(syncBody([M("inbound", "A"), M("outbound", "B", "2026-10-30T17:05:00Z")]));
  if (!p.ok) throw new Error("parse");
  const firstKey = (p as { messages: { key: string }[] }).messages[0].key;
  let rows: Record<string, unknown>[] = [];
  const r = await handleAction(p, "u1", CFG, deps({
    existingMessageKeys: () => Promise.resolve(new Set([firstKey])),
    insertMessages: (x) => { rows = x; return Promise.resolve(x.length); },
  }));
  assertEquals(r.status, 200);
  assertEquals(r.body.inserted, 1);
  assertEquals(r.body.skipped, 1);
  assertEquals(r.body.linked, "contact");
  assertEquals(rows[0].workspace_id, WS);
  assertEquals(rows[0].direction, "outbound");
});

Deno.test("sync: papel sem crm.write é recusado antes de gravar", async () => {
  let wrote = false;
  const p = parseBody(syncBody([M("inbound", "A")]));
  if (!p.ok) throw new Error("parse");
  const r = await handleAction(p, "u1", CFG, deps({
    getMembership: () => Promise.resolve({ workspace_id: WS, role: "viewer" }),
    upsertConversation: () => { wrote = true; return Promise.resolve("c"); },
  }));
  assertEquals(r.status, 403);
  assertEquals(wrote, false);
});
