import { assert, assertEquals } from "jsr:@std/assert@1";
import { ENSI_CONFIG } from "./core.ts";
import { createEnsiMetaLeadsHandler } from "./handler.ts";

const APP_SECRET = "synthetic-app-secret-not-a-credential";
const VERIFY_TOKEN = "synthetic-verify-token-not-a-credential";
const PAGE_TOKEN = "synthetic-page-token-not-a-credential";
const LEAD_ID = "900000000000001";

const payload = (overrides: Record<string, unknown> = {}) => ({
  object: "page",
  entry: [{
    id: ENSI_CONFIG.pageId,
    changes: [{
      field: "leadgen",
      value: {
        leadgen_id: LEAD_ID,
        form_id: ENSI_CONFIG.formId,
        page_id: ENSI_CONFIG.pageId,
        created_time: 1763750400,
        ...overrides,
      },
    }],
  }],
});

const graphLead = {
  id: LEAD_ID,
  form_id: ENSI_CONFIG.formId,
  created_time: "2026-11-20T12:00:00+0000",
  campaign_id: "111",
  adset_id: "222",
  ad_id: "333",
  field_data: [
    { name: "full_name", values: ["Pessoa Sintética"] },
    { name: "email", values: ["PESSOA@EXAMPLE.COM"] },
    { name: "phone_number", values: ["+351 912 345 678"] },
    { name: "edicao", values: ["Porto — Janeiro 2027"] },
    { name: "presencial", values: ["Sim, presencial"] },
    { name: "atividade", values: ["Profissional de estética"] },
  ],
};

async function signature(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

async function request(body: unknown, invalidSignature = false) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://local.test/functions/v1/ensi-meta-leads", {
    method: "POST",
    body: raw,
    headers: { "x-hub-signature-256": invalidSignature ? "sha256=00" : await signature(raw) },
  });
}

class MockStore implements EnsiLeadStore {
  calls: Record<string, unknown>[] = [];
  receipts = new Map<string, Record<string, unknown>>();

  async rpc(name: string, params: Record<string, unknown>) {
    assertEquals(name, "ensi_ingest_meta_lead");
    this.calls.push(params);
    const externalId = String(params.p_lead_id_external);
    const existing = this.receipts.get(externalId);
    if (existing) return { data: { ...existing, status: "duplicate" }, error: null };
    const result = {
      meta_lead_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      contact_disposition: "created",
    };
    this.receipts.set(externalId, result);
    return { data: { ...result, status: "accepted" }, error: null };
  }
}

function setup(options: { graphResponse?: Response; store?: MockStore } = {}) {
  const store = options.store ?? new MockStore();
  const graphRequests: Request[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    graphRequests.push(new Request(input, init));
    return options.graphResponse?.clone() ?? new Response(JSON.stringify(graphLead), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  const handler = createEnsiMetaLeadsHandler({
    store,
    fetchImpl,
    config: { appSecret: APP_SECRET, verifyToken: VERIFY_TOKEN, pageAccessToken: PAGE_TOKEN },
  });
  return { handler, store, graphRequests };
}

Deno.test("GET valida challenge sem expor configuração", async () => {
  const { handler } = setup();
  const valid = await handler(new Request(`http://local.test?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=12345`));
  assertEquals(valid.status, 200);
  assertEquals(await valid.text(), "12345");
  const invalid = await handler(new Request("http://local.test?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345"));
  assertEquals(invalid.status, 403);
  await invalid.text();
});

Deno.test("aceite: valida HMAC, usa Graph com prova e guarda campos ENSI", async () => {
  const { handler, store, graphRequests } = setup();
  const response = await handler(await request(payload()));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).status, "accepted");
  assertEquals(graphRequests.length, 1);
  const graphUrl = new URL(graphRequests[0].url);
  assert(graphUrl.searchParams.has("appsecret_proof"));
  assert(!graphUrl.searchParams.has("access_token"));
  assertEquals(graphRequests[0].headers.get("Authorization"), `Bearer ${PAGE_TOKEN}`);
  assertEquals(store.calls.length, 1);
  const normalized = store.calls[0].p_normalized_payload as Record<string, unknown>;
  assertEquals(normalized.full_name, "Pessoa Sintética");
  assertEquals(normalized.email, "pessoa@example.com");
  assertEquals(normalized.phone_number, "+351912345678");
  assertEquals(normalized.edicao, "Porto — Janeiro 2027");
  assertEquals(normalized.presencial, "Sim, presencial");
  assertEquals(normalized.atividade, "Profissional de estética");
  assertEquals((normalized.attribution as Record<string, unknown>).source, "graph_api");
});

Deno.test("assinatura inválida é rejeitada antes de Graph ou base", async () => {
  const { handler, store, graphRequests } = setup();
  const response = await handler(await request(payload(), true));
  assertEquals(response.status, 401);
  await response.text();
  assertEquals(store.calls.length, 0);
  assertEquals(graphRequests.length, 0);
});

Deno.test("outra Página e outro formulário são ignorados", async () => {
  for (const overrides of [{ page_id: "999" }, { form_id: "999" }]) {
    const { handler, store, graphRequests } = setup();
    const response = await handler(await request(payload(overrides)));
    assertEquals(response.status, 200);
    assertEquals((await response.json()).status, "ignored");
    assertEquals(store.calls.length, 0);
    assertEquals(graphRequests.length, 0);
  }
});

Deno.test("erro Graph é transitório e não cria lead", async () => {
  const { handler, store } = setup({ graphResponse: new Response("temporary", { status: 500 }) });
  const response = await handler(await request(payload()));
  assertEquals(response.status, 503);
  assertEquals(await response.json(), { status: "transient_error", reason: "graph_fetch_failed", retryable: true });
  assertEquals(store.calls.length, 0);
});

Deno.test("payload inválido é rejeitado sem Graph ou base", async () => {
  const { handler, store, graphRequests } = setup();
  const response = await handler(await request({ object: "page", entry: "bad" }));
  assertEquals(response.status, 400);
  await response.text();
  assertEquals(store.calls.length, 0);
  assertEquals(graphRequests.length, 0);
});

Deno.test("repetição Meta devolve duplicate e mantém uma única receção", async () => {
  const { handler, store } = setup();
  const first = await handler(await request(payload()));
  assertEquals((await first.json()).status, "accepted");
  const second = await handler(await request(payload()));
  assertEquals(second.status, 200);
  assertEquals((await second.json()).status, "duplicate");
  assertEquals(store.calls.length, 2);
  assertEquals((store as MockStore).receipts.size, 1);
});

Deno.test("sem dados úteis ou identidade Graph divergente é ignorado sem escrita", async () => {
  const empty = { ...graphLead, field_data: [{ name: "edicao", values: ["Porto"] }] };
  const first = setup({ graphResponse: Response.json(empty) });
  const emptyResponse = await first.handler(await request(payload()));
  assertEquals((await emptyResponse.json()).reason, "no_useful_data");
  assertEquals(first.store.calls.length, 0);

  const mismatch = setup({ graphResponse: Response.json({ ...graphLead, form_id: "999" }) });
  const mismatchResponse = await mismatch.handler(await request(payload()));
  assertEquals((await mismatchResponse.json()).reason, "graph_identity_mismatch");
  assertEquals(mismatch.store.calls.length, 0);
});
