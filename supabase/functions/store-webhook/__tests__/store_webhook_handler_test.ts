// Testes isolados do handler REAL de store-webhook. Segredos fictícios gerados aqui; sem rede, sem Stripe live.
import { assertEquals } from "jsr:@std/assert@1";
import Stripe from "stripe";
import { db, reset } from "./mock_supabase.ts";

const WS_A = "11111111-1111-4111-8111-111111111111";
const WS_B = "22222222-2222-4222-8222-222222222222";
const ORDER_1 = "aaaaaaaa-0000-4000-8000-000000000001";
const ORDER_2 = "aaaaaaaa-0000-4000-8000-000000000002";
const PROD = "bbbbbbbb-0000-4000-8000-000000000001";
const fake = () => "whsec_" + crypto.randomUUID().replaceAll("-", "");
const SECRET_A = fake(), SECRET_B = fake();

Deno.env.set("SUPABASE_URL", "http://mock.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-only");
Deno.env.delete("RESEND_API_KEY");
let kernelCalls = 0;
globalThis.fetch = (async () => { kernelCalls++; return new Response("{}"); }) as typeof fetch;
let handler!: (r: Request) => Promise<Response>;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: any) => { handler = h; return {} as any; };
await import("../index.ts");

const stripe = new Stripe("sk_test_unused", { apiVersion: "2025-08-27.basil" });
const crypto_ = Stripe.createSubtleCryptoProvider();

function seed(extra: { orders?: any[]; stock?: number } = {}) {
  reset({
    workspace_stripe_config: [
      { workspace_id: WS_A, is_active: true, store_webhook_secret_encrypted: SECRET_A },
      { workspace_id: WS_B, is_active: true, store_webhook_secret_encrypted: SECRET_B },
    ],
    store_orders: extra.orders ?? [order(ORDER_1, "cs_1", 2)],
    products: [{ id: PROD, workspace_id: WS_A, track_stock: true, stock_quantity: extra.stock ?? 5 }],
    store_webhook_events: [], store_settings: [{ workspace_id: WS_A }],
  });
  kernelCalls = 0; (globalThis as any).__emails = 0;
}
function order(id: string, sid: string, qty: number, ws = WS_A) {
  return { id, workspace_id: ws, status: "pending", total: 35.42, currency: "eur", stripe_session_id: sid, items: [{ product_id: PROD, quantity: qty, name: "x", unit_price: 17.71 }], customer_email: null, contact_id: null };
}
function evt(id: string, type: string, o: { sid?: string; paid?: boolean; ws?: string; orderId?: string; amount?: number; currency?: string } = {}) {
  return { id, type, object: "event", data: { object: {
    id: o.sid ?? "cs_1", object: "checkout.session", mode: "payment", payment_status: o.paid === false ? "unpaid" : "paid",
    amount_total: o.amount ?? 3542, currency: o.currency ?? "eur", payment_intent: "pi_test",
    metadata: { workspace_id: o.ws ?? WS_A, source: "store", store_order_id: o.orderId ?? ORDER_1 } } } };
}
async function send(e: any, secret = SECRET_A, sig?: string) {
  const payload = JSON.stringify(e);
  const header = sig ?? await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret, cryptoProvider: crypto_ });
  const res = await handler(new Request("http://x/", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
  return { status: res.status, body: await res.json() };
}
const ord = (id = ORDER_1) => db.tables.store_orders.find((o) => o.id === id)!;
const stock = () => db.tables.products[0].stock_quantity;

Deno.test("assinatura inválida / segredo de outro workspace / sem assinatura → recusado sem efeitos", async () => {
  seed();
  assertEquals((await send(evt("evt_bad", "checkout.session.completed"), SECRET_A, "t=1,v1=deadbeef")).status, 400);
  assertEquals((await send(evt("evt_x", "checkout.session.completed"), SECRET_B)).body.error, "invalid_signature");
  assertEquals((await send(evt("evt_x", "checkout.session.completed"), SECRET_A, "")).status, 400);
  assertEquals(ord().status, "pending"); assertEquals(db.tables.store_webhook_events.length, 0); assertEquals(stock(), 5);
});

Deno.test("assinatura verdadeira (segredo fictício): completed paid → paid, stock −2 uma vez", async () => {
  seed();
  const r = await send(evt("evt_ok", "checkout.session.completed"));
  assertEquals(r.body.outcome, "paid"); assertEquals(ord().status, "paid"); assertEquals(stock(), 3);
  assertEquals(db.tables.store_webhook_events[0].outcome, "paid");
});

Deno.test("completed unpaid → pending; async_payment_succeeded → paid; async_failed depois não sobrescreve", async () => {
  seed();
  assertEquals((await send(evt("evt_c", "checkout.session.completed", { paid: false }))).body.outcome, "pending");
  assertEquals(ord().status, "pending"); assertEquals(stock(), 5);
  assertEquals((await send(evt("evt_s", "checkout.session.async_payment_succeeded"))).body.outcome, "paid");
  assertEquals(stock(), 3);
  const f = await send(evt("evt_f", "checkout.session.async_payment_failed", { paid: false }));
  assertEquals(f.body.outcome, "already_paid"); assertEquals(ord().status, "paid");
});

Deno.test("duplicados simultâneos do mesmo evento → efeitos uma só vez", async () => {
  seed();
  const rs = await Promise.all([1, 2, 3].map(() => send(evt("evt_dup", "checkout.session.completed"))));
  assertEquals(rs.filter((r) => r.body.outcome === "paid").length, 1);
  assertEquals(rs.filter((r) => r.body.duplicate).length, 2);
  assertEquals(stock(), 3); assertEquals(kernelCalls, 2);
});

Deno.test("eventos diferentes simultâneos para a mesma sessão (completed + async_succeeded) → um só pagamento", async () => {
  seed();
  const rs = await Promise.all([send(evt("e1", "checkout.session.completed")), send(evt("e2", "checkout.session.async_payment_succeeded"))]);
  assertEquals(rs.filter((r) => r.body.outcome === "paid").length, 1); assertEquals(stock(), 3);
});

Deno.test("cross-workspace: metadata do WS_B assinado com segredo do WS_B para sessão do WS_A → não toca WS_A", async () => {
  seed();
  const r = await send(evt("evt_cross", "checkout.session.completed", { ws: WS_B }), SECRET_B);
  assertEquals(r.body.outcome, "order_not_found"); assertEquals(ord().status, "pending"); assertEquals(stock(), 5);
});

Deno.test("montante / moeda / encomenda divergentes → rejeitado, continua pending", async () => {
  seed();
  assertEquals((await send(evt("m1", "checkout.session.completed", { amount: 100 }))).body.outcome, "amount_mismatch");
  assertEquals((await send(evt("m2", "checkout.session.completed", { currency: "usd" }))).body.outcome, "currency_mismatch");
  assertEquals((await send(evt("m3", "checkout.session.completed", { orderId: ORDER_2 }))).body.outcome, "order_mismatch");
  assertEquals(ord().status, "pending"); assertEquals(stock(), 5);
});

Deno.test("falha DB na transição para paid → 500, registo libertado, retry processa", async () => {
  seed();
  db.faults.push({ table: "store_orders", op: "update", times: 1 });
  assertEquals((await send(evt("evt_r", "checkout.session.completed"))).status, 500);
  assertEquals(db.tables.store_webhook_events.length, 0); assertEquals(ord().status, "pending");
  assertEquals((await send(evt("evt_r", "checkout.session.completed"))).body.outcome, "paid"); assertEquals(stock(), 3);
});

// ---------- Lacunas a confirmar (os asserts descrevem o comportamento ATUAL observado) ----------

Deno.test("LACUNA 1: entrega duplicada durante 1.ª tentativa que falha → evento perdido", async () => {
  seed();
  let second!: Promise<any>;
  db.faults.push({ table: "store_orders", op: "update", times: 1, before: async () => { second = send(evt("evt_lost", "checkout.session.completed")); await second; } });
  const first = await send(evt("evt_lost", "checkout.session.completed"));
  const dup = await second;
  console.log("  1.ª:", first.status, "duplicado:", dup.status, JSON.stringify(dup.body));
  assertEquals(first.status, 500); assertEquals(dup.status, 200); assertEquals(dup.body.duplicate, true);
  // Stripe recebeu 2xx para este evento → deixa de repetir. Encomenda fica pending sem novo envio.
  assertEquals(ord().status, "pending"); assertEquals(db.tables.store_webhook_events.length, 0);
});

Deno.test("LACUNA 2: erro DB na leitura da encomenda é tratado como order_not_found (200) → retry vira duplicado", async () => {
  seed();
  db.faults.push({ table: "store_orders", op: "select", times: 1 });
  const r = await send(evt("evt_sel", "checkout.session.completed"));
  console.log("  leitura falhada →", r.status, JSON.stringify(r.body));
  const retry = await send(evt("evt_sel", "checkout.session.completed"));
  assertEquals(r.status, 200); assertEquals(retry.body.duplicate, true); assertEquals(ord().status, "pending");
});

Deno.test("LACUNA 3: stock — duas encomendas concorrentes, compare-and-swap sem retry perde um decremento", async () => {
  seed({ orders: [order(ORDER_1, "cs_1", 2), order(ORDER_2, "cs_2", 2)], stock: 5 });
  const rs = await Promise.all([
    send(evt("o1", "checkout.session.completed", { sid: "cs_1", orderId: ORDER_1 })),
    send(evt("o2", "checkout.session.completed", { sid: "cs_2", orderId: ORDER_2 })),
  ]);
  console.log("  ambas pagas:", rs.map((r) => r.body.outcome).join(","), "stock final:", stock(), "(esperado 1)");
  assertEquals(ord(ORDER_1).status, "paid"); assertEquals(ord(ORDER_2).status, "paid");
  assertEquals(stock(), 3); // comportamento atual: um decremento perdido em silêncio
});

Deno.test("LACUNA 4: falha DB no stock após paid é silenciosa e não repetível", async () => {
  seed();
  db.faults.push({ table: "products", op: "update", times: 1 });
  const r = await send(evt("evt_st", "checkout.session.completed"));
  const retry = await send(evt("evt_st", "checkout.session.completed"));
  console.log("  resposta:", r.status, r.body.outcome, "| retry:", JSON.stringify(retry.body), "| stock:", stock());
  assertEquals(r.body.outcome, "paid"); assertEquals(stock(), 5); assertEquals(retry.body.duplicate, true);
});
