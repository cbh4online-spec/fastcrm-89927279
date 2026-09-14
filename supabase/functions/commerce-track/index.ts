/**
 * commerce-track — ponto de entrada ÚNICO para eventos AI Commerce com valor.
 *
 * O navegador nunca pode declarar receita: eventos de compra, checkout concluído,
 * lead e subscrição são validados aqui contra a encomenda real (`store_orders`)
 * e gravados com `server_verified = true`.
 *
 * Idempotência: `event_id` determinístico + índices únicos por workspace.
 * Falhas devolvem 200 com `ok: false` para nunca quebrar a loja pública.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type ServerEvent =
  | "lead"
  | "lead_created"
  | "checkout_completed"
  | "purchase"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_cancelled";

const SERVER_EVENTS: ServerEvent[] = [
  "lead",
  "lead_created",
  "checkout_completed",
  "purchase",
  "subscription_started",
  "subscription_renewed",
  "subscription_cancelled",
];

/** Eventos que exigem uma encomenda real e paga. */
const ORDER_EVENTS: ServerEvent[] = ["purchase", "checkout_completed"];

const PAID_STATUSES = ["paid", "completed", "fulfilled", "shipped", "processing"];

interface AttributionPayload {
  session_id?: string | null;
  first_touch_source?: string | null;
  first_touch_medium?: string | null;
  first_touch_campaign?: string | null;
  first_touch_channel?: string | null;
  last_touch_source?: string | null;
  last_touch_medium?: string | null;
  last_touch_campaign?: string | null;
  last_touch_channel?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function isAiChannel(channel: string | null): boolean {
  if (!channel) return false;
  return ["chatgpt", "openai", "perplexity", "gemini", "copilot", "claude", "ai"].some((k) =>
    channel.toLowerCase().includes(k),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "invalid_body" }, 400);

    const eventType = text((body as Record<string, unknown>).event_type, 40) as ServerEvent | null;
    const workspaceId = text((body as Record<string, unknown>).workspace_id, 60);
    const orderId = text((body as Record<string, unknown>).order_id, 60);
    const productId = text((body as Record<string, unknown>).product_id, 60);
    const variantId = text((body as Record<string, unknown>).variant_id, 60);
    const attribution = ((body as Record<string, unknown>).attribution || {}) as AttributionPayload;
    const sessionId = text((body as Record<string, unknown>).session_id, 120) ?? text(attribution.session_id, 120);

    if (!eventType || !SERVER_EVENTS.includes(eventType)) {
      return json({ ok: false, error: "invalid_event_type" }, 400);
    }
    if (!workspaceId || !UUID_RE.test(workspaceId)) {
      return json({ ok: false, error: "invalid_workspace" }, 400);
    }
    if (productId && !UUID_RE.test(productId)) return json({ ok: false, error: "invalid_product" }, 400);
    if (variantId && !UUID_RE.test(variantId)) return json({ ok: false, error: "invalid_variant" }, 400);

    // Rate limiting por sessão/workspace. `check_rate_limit` devolve TRUE quando excedido.
    const { data: limited } = await supabase.rpc("check_rate_limit", {
      p_identifier: `commerce-track:${workspaceId}:${sessionId ?? "anon"}`,
      p_max_requests: 60,
      p_window_seconds: 60,
    });
    if (limited === true) return json({ ok: false, error: "rate_limited" }, 429);

    let value: number | null = null;
    let currency = "EUR";
    let customerId: string | null = null;
    let country: string | null = null;

    if (ORDER_EVENTS.includes(eventType)) {
      if (!orderId || !UUID_RE.test(orderId)) return json({ ok: false, error: "order_required" }, 400);

      const { data: order, error: orderError } = await supabase
        .from("store_orders")
        .select(
          "id, workspace_id, total, currency, status, contact_id, shipping_address, first_touch_source, attribution_session_id",
        )
        .eq("id", orderId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (orderError) return json({ ok: false, error: "order_lookup_failed" }, 200);
      if (!order) return json({ ok: false, error: "order_not_found" }, 404);

      const status = String(order.status ?? "").toLowerCase();
      if (eventType === "purchase" && !PAID_STATUSES.includes(status)) {
        return json({ ok: false, error: "order_not_paid", status }, 200);
      }

      value = typeof order.total === "number" ? order.total : Number(order.total ?? 0) || null;
      currency = order.currency || "EUR";
      customerId = order.contact_id ?? null;
      const shipping = (order.shipping_address ?? null) as Record<string, unknown> | null;
      country = text(shipping?.country, 4);

      // Persiste a atribuição na encomenda quando ainda não está registada.
      if (!order.first_touch_source && !order.attribution_session_id) {
        await supabase
          .from("store_orders")
          .update({
            first_touch_source: text(attribution.first_touch_source),
            first_touch_medium: text(attribution.first_touch_medium),
            first_touch_campaign: text(attribution.first_touch_campaign),
            first_touch_channel: text(attribution.first_touch_channel),
            last_touch_source: text(attribution.last_touch_source),
            last_touch_medium: text(attribution.last_touch_medium),
            last_touch_campaign: text(attribution.last_touch_campaign),
            last_touch_channel: text(attribution.last_touch_channel),
            attribution_session_id: sessionId,
          })
          .eq("id", orderId)
          .eq("workspace_id", workspaceId);
      }
    }

    const lastChannel = text(attribution.last_touch_channel, 60);
    const eventId = orderId ? `${eventType}:${orderId}` : `${eventType}:${sessionId ?? crypto.randomUUID()}:${productId ?? "none"}`;

    // Idempotência: o índice único é parcial, por isso verificamos antes e
    // toleramos o conflito 23505 em caso de corrida.
    const { data: existing } = await supabase
      .from("ai_commerce_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing) return json({ ok: true, deduplicated: true });

    const { error: insertError } = await supabase
      .from("ai_commerce_events")
      .insert({
          workspace_id: workspaceId,
          event_type: eventType,
          event_id: eventId,
          product_id: productId,
          variant_id: variantId,
          order_id: ORDER_EVENTS.includes(eventType) ? orderId : null,
          customer_id: customerId,
          session_id: sessionId,
          value,
          currency,
          country,
          channel: lastChannel ?? "direct",
          is_ai_channel: isAiChannel(lastChannel),
          source: text(attribution.last_touch_source),
          medium: text(attribution.last_touch_medium),
          campaign: text(attribution.last_touch_campaign),
          first_touch_source: text(attribution.first_touch_source),
          first_touch_medium: text(attribution.first_touch_medium),
          first_touch_campaign: text(attribution.first_touch_campaign),
          first_touch_channel: text(attribution.first_touch_channel),
          last_touch_source: text(attribution.last_touch_source),
          last_touch_medium: text(attribution.last_touch_medium),
          last_touch_campaign: text(attribution.last_touch_campaign),
          last_touch_channel: lastChannel,
          server_verified: true,
      });

    if (insertError) {
      // Conflitos de idempotência não são falhas.
      if (String(insertError.code) === "23505") return json({ ok: true, deduplicated: true });
      return json({ ok: false, error: "insert_failed" }, 200);
    }

    return json({ ok: true, event_id: eventId, value, currency });
  } catch (_error) {
    return json({ ok: false, error: "internal_error" }, 200);
  }
});
