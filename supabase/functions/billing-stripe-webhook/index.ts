/**
 * Fase 1M — Webhook canónico para subscrições SaaS (Lovable Cloud / Fase 1L+1M)
 *
 * Trata:
 *  - checkout.session.completed (subscription mode)
 *  - customer.subscription.created
 *  - customer.subscription.updated
 *  - customer.subscription.deleted
 *  - invoice.paid
 *  - invoice.payment_failed
 *
 * Escreve em workspace_subscriptions e regista cada evento em billing_stripe_events
 * (idempotente). NÃO trata fluxos antigos (store, propostas, renovações) —
 * esses continuam em stripe-webhook / subscription-webhook.
 *
 * Exige STRIPE_WEBHOOK_SECRET configurada (signing secret do webhook endpoint).
 *
 * Configuração: este endpoint deve ser configurado no Stripe Dashboard
 * para enviar apenas os eventos listados acima.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[BILLING-STRIPE-WEBHOOK] ${step}${d}`);
};

Deno.serve(async (req) => {
  // Webhooks Stripe são POST puros, sem CORS necessário (chamados server-to-server)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!stripeKey) return new Response("STRIPE_SECRET_KEY missing", { status: 500 });
  if (!webhookSecret) return new Response("STRIPE_WEBHOOK_SECRET missing", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(supabaseUrl, serviceKey);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    log("signature failed", { error: (err as Error).message });
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  log("event received", { id: event.id, type: event.type });

  // Idempotência
  const { data: already } = await admin
    .from("billing_stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (already) {
    log("event already processed (idempotent)", { id: event.id });
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  // Helpers
  const detectMode = (): "test" | "live" => (event.livemode ? "live" : "test");

  const upsertSubscription = async (
    sub: Stripe.Subscription,
    extras: Record<string, unknown> = {},
  ) => {
    const workspaceId = (sub.metadata?.workspace_id as string) || null;
    if (!workspaceId) {
      log("subscription without workspace_id metadata, skipping", { sub: sub.id });
      return { workspaceId: null, billingPlanId: null };
    }

    const billingPlanId = (sub.metadata?.billing_plan_id as string) || null;
    const planCode = (sub.metadata?.plan_code as string) || null;
    const item = sub.items.data[0];
    const priceId = item?.price?.id ?? null;
    const interval = item?.price?.recurring?.interval ?? null;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    const update: Record<string, unknown> = {
      workspace_id: workspaceId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      billing_interval: interval === "year" ? "yearly" : "monthly",
      stripe_mode: detectMode(),
      updated_at: new Date().toISOString(),
      ...extras,
    };
    if (sub.trial_start) update.trial_started_at = new Date(sub.trial_start * 1000).toISOString();
    if (sub.trial_end) update.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
    if (billingPlanId) update.billing_plan_id = billingPlanId;
    if (planCode) update.plan = planCode;

    // Procurar subscrição existente
    const { data: existing } = await admin
      .from("workspace_subscriptions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin.from("workspace_subscriptions").update(update).eq("id", existing.id);
    } else {
      await admin.from("workspace_subscriptions").insert(update);
    }
    log("subscription upserted", { workspaceId, sub: sub.id, status: sub.status });
    return { workspaceId, billingPlanId };
  };

  let workspaceId: string | null = null;
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripeInvoiceId: string | null = null;
  let processStatus: "processed" | "failed" | "skipped" = "processed";
  let processError: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) {
          processStatus = "skipped";
          break;
        }
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const r = await upsertSubscription(sub);
        workspaceId = r.workspaceId;
        stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        stripeSubscriptionId = sub.id;
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const r = await upsertSubscription(sub);
        workspaceId = r.workspaceId;
        stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        stripeSubscriptionId = sub.id;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const r = await upsertSubscription(sub, {
          status: "canceled",
          cancel_at_period_end: true,
        });
        workspaceId = r.workspaceId;
        stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        stripeSubscriptionId = sub.id;
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        stripeInvoiceId = invoice.id;
        stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
        stripeSubscriptionId = subId;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          workspaceId = (sub.metadata?.workspace_id as string) || null;
          if (workspaceId) {
            await admin.from("workspace_subscriptions").update({
              stripe_latest_invoice_id: invoice.id,
              stripe_payment_status: invoice.status,
              last_payment_at: new Date((invoice.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
              last_payment_amount: (invoice.amount_paid ?? 0) / 100,
              status: sub.status,
              updated_at: new Date().toISOString(),
            }).eq("workspace_id", workspaceId);
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        stripeInvoiceId = invoice.id;
        stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
        stripeSubscriptionId = subId;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          workspaceId = (sub.metadata?.workspace_id as string) || null;
          if (workspaceId) {
            await admin.from("workspace_subscriptions").update({
              stripe_latest_invoice_id: invoice.id,
              stripe_payment_status: invoice.status,
              last_payment_failure_at: new Date().toISOString(),
              last_payment_failure_reason: invoice.last_finalization_error?.message
                ?? `Payment failed (attempt ${invoice.attempt_count ?? 0})`,
              status: sub.status,
              updated_at: new Date().toISOString(),
            }).eq("workspace_id", workspaceId);
          }
        }
        break;
      }
      default:
        processStatus = "skipped";
        log("event type not handled", { type: event.type });
    }
  } catch (err) {
    processStatus = "failed";
    processError = err instanceof Error ? err.message : String(err);
    log("ERROR processing event", { type: event.type, error: processError });
  }

  // Registar evento (mesmo se falhou, para auditoria + evitar reprocessamento infinito)
  await admin.from("billing_stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    workspace_id: workspaceId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_invoice_id: stripeInvoiceId,
    payload: event.data.object as any,
    status: processStatus,
    error: processError,
  });

  return new Response(JSON.stringify({ received: true, status: processStatus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
