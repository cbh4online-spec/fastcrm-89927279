// Stripe webhook handler — credita workspace comprador automaticamente
// quando o pagamento confirma, independentemente do browser do utilizador.
//
// Eventos processados:
//   - checkout.session.completed (modo "payment", kind=credit_package)
//   - payment_intent.succeeded   (fallback de segurança, mesma metadata)
//
// Idempotente via stripe_payment_intent_id.
// Não exige JWT (chamado pela Stripe). Validação por assinatura HMAC.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[stripe-credits-webhook] ${step}${d}`);
};

function ok(body: Record<string, unknown> = { received: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return ok({ ignored: true, reason: "method_not_allowed" });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !serviceKey) {
    log("missing_env");
    return ok({ fallback: true, error: "missing_env" });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(supabaseUrl, serviceKey);

  // ---- Construct + verify event ----
  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) return ok({ fallback: true, error: "missing_signature" });
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
    } else {
      // Sem secret configurado, parseia mas avisa nos logs (não falha o pedido)
      log("no_webhook_secret_configured_unsafe_parse");
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    log("signature_verification_failed", { error: (err as Error).message });
    return ok({ fallback: true, error: "invalid_signature" });
  }

  log("event_received", { type: event.type, id: event.id });

  // ---- Extract metadata + payment intent ----
  let metadata: Record<string, string> = {};
  let paymentIntentId: string | null = null;
  let amountTotalCents = 0;
  let currency = "eur";
  let sessionId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return ok({ ignored: true, reason: "not_paid" });
    }
    metadata = (session.metadata ?? {}) as Record<string, string>;
    paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
    amountTotalCents = session.amount_total ?? 0;
    currency = (session.currency ?? "eur").toLowerCase();
    sessionId = session.id;
  } else if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    metadata = (pi.metadata ?? {}) as Record<string, string>;
    paymentIntentId = pi.id;
    amountTotalCents = pi.amount_received ?? pi.amount ?? 0;
    currency = (pi.currency ?? "eur").toLowerCase();
  } else {
    return ok({ ignored: true, reason: "event_not_handled", type: event.type });
  }

  const isCreditPurchase =
    metadata.kind === "credit_package" || metadata.type === "credit_purchase";
  if (!isCreditPurchase) {
    return ok({ ignored: true, reason: "not_credit_purchase" });
  }

  const workspaceId = metadata.buyer_workspace_id || metadata.workspace_id;
  const packageId = metadata.package_id || null;
  const userId = metadata.user_id || null;
  const creditsAmount = parseInt(metadata.credits_amount ?? "0", 10);

  if (!workspaceId || !creditsAmount || !paymentIntentId) {
    log("invalid_metadata", { workspaceId, creditsAmount, paymentIntentId });
    return ok({ fallback: true, error: "invalid_metadata" });
  }

  // ---- Idempotency ----
  const { data: existing } = await admin
    .from("credit_purchases")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    log("already_processed", { purchaseId: existing.id });
    return ok({ already_processed: true });
  }

  // ---- Insert purchase ----
  const { error: purchaseErr } = await admin.from("credit_purchases").insert({
    workspace_id: workspaceId,
    purchased_by: userId,
    package_id: packageId,
    credits_purchased: creditsAmount,
    amount_paid: amountTotalCents / 100,
    currency: currency.toUpperCase(),
    stripe_payment_intent_id: paymentIntentId,
    status: "completed",
  });

  if (purchaseErr) {
    log("purchase_insert_error", purchaseErr);
    return ok({ fallback: true, error: "purchase_insert_failed", detail: purchaseErr.message });
  }

  // ---- Update wallet ----
  const { data: wallet } = await admin
    .from("credit_wallets")
    .select("id, balance")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (wallet) {
    await admin
      .from("credit_wallets")
      .update({ balance: wallet.balance + creditsAmount, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);
  } else {
    await admin.from("credit_wallets").insert({
      workspace_id: workspaceId,
      balance: creditsAmount,
      reserved_balance: 0,
    });
  }

  // ---- Audit ledger ----
  await admin.from("credit_ledger").insert({
    workspace_id: workspaceId,
    user_id: userId,
    action_key: "credit_purchase",
    module: "billing",
    credits_amount: creditsAmount,
    direction: "credit",
    status: "completed",
    description: `Compra de ${creditsAmount} créditos (webhook Stripe)`,
    reference_type: "purchase",
    reference_id: packageId,
    metadata: {
      stripe_event_id: event.id,
      stripe_session_id: sessionId,
      payment_intent_id: paymentIntentId,
      source: "webhook",
    },
  });

  log("credit_applied", { workspaceId, creditsAmount, paymentIntentId });
  return ok({ success: true, credits: creditsAmount, workspaceId });
});
