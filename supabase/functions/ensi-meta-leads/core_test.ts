import { assert, assertEquals } from "jsr:@std/assert@1";
import { ENSI_CONFIG, parseMetaJson } from "./core.ts";
import { createEnsiMetaLeadsHandler } from "./handler.ts";

const APP_SECRET = "synthetic-app-secret-not-a-credential";
const VERIFY_TOKEN = "synthetic-verify-token-not-a-credential";
const PAGE_TOKEN = "synthetic-page-token-not-a-credential";
const LEAD_ID = "900000000000001";
const OTHER_LEAD_ID = "900000000000002";

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
    body: new TextEncoder().encode(raw),
    headers: { "x-hub-signature-256": invalidSignature ? "sha256=00" : await signature(raw) },
  });
}

class MockStore {
  calls: Record<string, unknown>[] = [];
  receipts = new Map<string, Record<string, unknown>>();

  async rpc(name: string, params: Record<string, unknown>) {
    assertEquals(name, "ensi_ingest_meta_lead");
    this.calls.push(params);
    const externalId = String(params.p_lead_id_external);
    const existing = this.receipts.get(externalId);
    if (existing) return { data: { ...existing, status: "duplicate" }, error: null };
    const result = {
      meta_lead_id: crypto.randomUUID(),
      contact_disposition: "created",
    };
    this.receipts.set(externalId, result);
    return { data: { ...result, status: "accepted" }, error: null };
  }
}

function setup(options: {
  graphRespond?: (leadId: string, call: number) => Response;
  store?: MockStore;
} = {}) {
  const store = options.store ?? new MockStore();
  const graphRequests: Request[] = [];
  let graphCalls = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const graphRequest = new Request(input, init);
    graphRequests.push(graphRequest);
    graphCalls += 1;
    const leadId = new URL(graphRequest.url).pathname.split("/").pop()!;
    return options.graphRespond?.(leadId, graphCalls) ?? Response.json({
      ...graphLead,
      id: leadId,
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

Deno.test("aceite: bytes com Unicode, Graph v26 e campos canónicos", async () => {
  const { handler, store, graphRequests } = setup();
  const unicodePayload = payload() as any;
  unicodePayload.entry[0].nota = "Confirmação João — ação";
  const response = await handler(await request(unicodePayload));
  assertEquals(response.status, 200);
  assertEquals((await response.json()).accepted, 1);
  const graphUrl = new URL(graphRequests[0].url);
  assert(graphUrl.pathname.includes("/v26.0/"));
  assert(graphUrl.searchParams.has("appsecret_proof"));
  assert(!graphUrl.searchParams.has("access_token"));
  assertEquals(graphRequests[0].headers.get("Authorization"), `Bearer ${PAGE_TOKEN}`);
  const normalized = store.calls[0].p_normalized_payload as Record<string, unknown>;
  assertEquals(normalized.full_name, "Pessoa Sintética");
  assertEquals(normalized.name, "Pessoa Sintética");
  assertEquals(normalized.email, "pessoa@example.com");
  assertEquals(normalized.phone_number, "+351912345678");
  assertEquals(normalized.edicao, "Porto — Janeiro 2027");
  assertEquals(normalized.presencial, "Sim, presencial");
  assertEquals(normalized.atividade, "Profissional de estética");
  assertEquals((normalized.attribution as Record<string, unknown>).source, "graph_api");
});

Deno.test("Form ID numérico grande permanece exato no runtime suportado", async () => {
  const raw = `{"object":"page","entry":[{"id":"${ENSI_CONFIG.pageId}","changes":[{"field":"leadgen","value":{"leadgen_id":"${LEAD_ID}","form_id":29967420322844561,"page_id":"${ENSI_CONFIG.pageId}"}}]}]}`;
  const parsed = parseMetaJson(raw) as any;
  assertEquals(parsed.entry[0].changes[0].value.form_id, ENSI_CONFIG.formId);
  const { handler, store } = setup();
  const response = await handler(await request(raw));
  assertEquals(response.status, 200);
  await response.text();
  assertEquals(store.calls[0].p_form_id, ENSI_CONFIG.formId);
});

Deno.test("eventos alheios são filtrados antes da validação leadgen", async () => {
  const mixed = {
    object: "page",
    entry: [
      { id: "999", changes: [{ field: "leadgen", value: { invalid: true } }] },
      { id: ENSI_CONFIG.pageId, changes: [
        { field: "feed", value: { invalid: true } },
        { field: "leadgen", value: { form_id: "999", page_id: ENSI_CONFIG.pageId } },
        { field: "leadgen", value: payload().entry[0].changes[0].value },
      ] },
    ],
  };
  const { handler, store } = setup();
  const response = await handler(await request(mixed));
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.accepted, 1);
  assertEquals(body.ignored, 3);
  assertEquals(store.calls.length, 1);
});

Deno.test("processa todas as referências ENSI antes do 2xx", async () => {
  const batch = payload();
  batch.entry[0].changes.push({
    field: "leadgen",
    value: { ...batch.entry[0].changes[0].value, leadgen_id: OTHER_LEAD_ID },
  });
  const { handler, store } = setup();
  const response = await handler(await request(batch));
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.accepted, 2);
  assertEquals(body.results.length, 2);
  assertEquals(store.receipts.size, 2);
});

Deno.test("503 após um aceite; repetição deduplica o anterior e conclui o restante", async () => {
  const batch = payload();
  batch.entry[0].changes.push({
    field: "leadgen",
    value: { ...batch.entry[0].changes[0].value, leadgen_id: OTHER_LEAD_ID },
  });
  let failSecond = true;
  const { handler, store } = setup({
    graphRespond: (leadId) => {
      if (failSecond && leadId === OTHER_LEAD_ID) {
        failSecond = false;
        return new Response("temporary", { status: 500 });
      }
      return Response.json({ ...graphLead, id: leadId });
    },
  });
  const first = await handler(await request(batch));
  assertEquals(first.status, 503);
  assertEquals((await first.json()).completed, 1);
  assertEquals(store.receipts.size, 1);

  const retry = await handler(await request(batch));
  assertEquals(retry.status, 200);
  const body = await retry.json();
  assertEquals(body.accepted, 1);
  assertEquals(body.duplicates, 1);
  assertEquals(store.receipts.size, 2);
});

Deno.test("dados de contacto inválidos não bloqueiam outro lead da batelada", async () => {
  const batch = payload();
  batch.entry[0].changes.push({
    field: "leadgen",
    value: { ...batch.entry[0].changes[0].value, leadgen_id: OTHER_LEAD_ID },
  });
  const { handler, store } = setup({
    graphRespond: (leadId) => Response.json(leadId === LEAD_ID
      ? { ...graphLead, id: leadId, field_data: [{ name: "full_name", values: ["Sem contacto"] }] }
      : { ...graphLead, id: leadId }),
  });
  const response = await handler(await request(batch));
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.accepted, 1);
  assertEquals(body.ignored, 1);
  assertEquals(store.receipts.size, 1);
});

Deno.test("assinatura inválida é rejeitada antes de Graph ou base", async () => {
  const { handler, store, graphRequests } = setup();
  const response = await handler(await request(payload(), true));
  assertEquals(response.status, 401);
  await response.text();
  assertEquals(store.calls.length, 0);
  assertEquals(graphRequests.length, 0);
});

Deno.test("erro Graph é transitório e não cria lead", async () => {
  const { handler, store } = setup({ graphRespond: () => new Response("temporary", { status: 500 }) });
  const response = await handler(await request(payload()));
  assertEquals(response.status, 503);
  assertEquals((await response.json()).reason, "graph_fetch_failed");
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

Deno.test("ID ou formulário Graph divergente é ignorado sem escrita", async () => {
  for (const difference of [{ id: "999" }, { form_id: "999" }]) {
    const { handler, store } = setup({ graphRespond: () => Response.json({ ...graphLead, ...difference }) });
    const response = await handler(await request(payload()));
    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.status, "ignored");
    assertEquals(body.results[0].reason, "graph_identity_mismatch");
    assertEquals(store.calls.length, 0);
  }
});
