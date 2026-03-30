import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const logStore = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-WEBHOOK] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Tn6lMOO7zRREaL": "basic",
  "prod_Tn6mQSM7DNs1TO": "pro",
  "prod_Tn6mBblFLd6lD2": "agency",
};

// Check if event was already processed (idempotency)
async function checkEventIdempotency(
  supabase: any,
  eventId: string,
  _workspaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("stripe_event_log")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  return !!data;
}

// Record processed event
async function recordStripeEvent(
  supabase: any,
  eventId: string,
  eventType: string,
  workspaceId: string,
  payload?: unknown
) {
  await supabase.from("stripe_event_log").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    workspace_id: workspaceId,
    payload: payload || null,
  });
}

// Trigger automation for payment events
async function triggerPaymentAutomation(
  supabase: any,
  workspaceId: string,
  opportunityId: string,
  triggerType: "payment_confirmed" | "proposal_paid",
  paymentData: Record<string, unknown>
) {
  logStep("Triggering payment automation", { workspaceId, opportunityId, triggerType });

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("trigger", triggerType)
    .eq("is_active", true);

  if (!rules || rules.length === 0) {
    logStep("No active automation rules for trigger", { triggerType });
    return;
  }

  for (const rule of rules) {
    await supabase.from("automation_logs").insert({
      workspace_id: workspaceId,
      rule_id: rule.id,
      trigger_data: {
        opportunity_id: opportunityId,
        ...paymentData,
      },
      status: "pending",
      started_at: new Date().toISOString(),
    });

    logStep("Created automation log for rule", { ruleId: rule.id, ruleName: rule.name });
  }
}

/* ------------------------------------------------------------------ */
/*  Store-specific helpers                                             */
/* ------------------------------------------------------------------ */

/** Consume a gift card reservation: debit real balance, mark consumed */
async function consumeGiftCardReservation(
  supabase: any,
  reservationId: string,
  workspaceId: string,
  orderId: string,
) {
  logStore("[STORE-GIFTCARD] Consuming reservation", { reservationId });

  const { data: reservation } = await supabase
    .from("store_gift_card_reservations")
    .select("id, gift_card_id, amount_reserved, status")
    .eq("id", reservationId)
    .single();

  if (!reservation || reservation.status !== "reserved") {
    logStore("[STORE-GIFTCARD] Reservation not in 'reserved' state, skipping", {
      reservationId,
      currentStatus: reservation?.status,
    });
    return;
  }

  // Get current gift card balance
  const { data: gc } = await supabase
    .from("store_gift_cards")
    .select("id, current_balance")
    .eq("id", reservation.gift_card_id)
    .single();

  if (!gc) {
    logStore("[STORE-GIFTCARD] Gift card not found", { giftCardId: reservation.gift_card_id });
    return;
  }

  const deduction = reservation.amount_reserved;
  const newBalance = gc.current_balance - deduction;

  // Debit balance
  await supabase
    .from("store_gift_cards")
    .update({
      current_balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? "depleted" : "active",
    })
    .eq("id", gc.id);

  // Record transaction
  await supabase.from("store_gift_card_transactions").insert({
    gift_card_id: gc.id,
    workspace_id: workspaceId,
    order_id: orderId,
    amount: deduction,
    balance_before: gc.current_balance,
    balance_after: Math.max(0, newBalance),
    description: `Pagamento confirmado — reserva ${reservationId}`,
  });

  // Mark reservation consumed
  await supabase
    .from("store_gift_card_reservations")
    .update({
      status: "consumed",
      consumed_at: new Date().toISOString(),
      store_order_id: orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  logStore("[STORE-GIFTCARD] Reservation consumed", {
    reservationId,
    deduction,
    newBalance: Math.max(0, newBalance),
  });
}

/** Release a gift card reservation (expired/failed payment) */
async function releaseGiftCardReservation(
  supabase: any,
  reservationId: string,
) {
  logStore("[STORE-GIFTCARD] Releasing reservation", { reservationId });

  const { data: reservation } = await supabase
    .from("store_gift_card_reservations")
    .select("id, status")
    .eq("id", reservationId)
    .single();

  if (!reservation || reservation.status !== "reserved") {
    logStore("[STORE-GIFTCARD] Reservation not in 'reserved' state, skipping release", {
      reservationId,
      currentStatus: reservation?.status,
    });
    return;
  }

  await supabase
    .from("store_gift_card_reservations")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  logStore("[STORE-GIFTCARD] Reservation released", { reservationId });
}

/** Handle store order payment confirmed */
async function handleStoreOrderCompleted(
  supabase: any,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const metadata = session.metadata || {};
  const workspaceId = metadata.workspace_id;
  const storeOrderId = metadata.store_order_id;
  const reservationId = metadata.gift_card_reservation_id;
  const couponId = metadata.coupon_id;

  if (!workspaceId) {
    logStore("Missing workspace_id in metadata, skipping");
    return;
  }

  // 1. Idempotency check
  const alreadyProcessed = await checkEventIdempotency(supabase, eventId, workspaceId);
  if (alreadyProcessed) {
    logStore("Event already processed, skipping", { eventId });
    return;
  }

  // 2. Find the store order
  let orderId = storeOrderId;
  if (!orderId) {
    // Fallback: find by stripe_session_id
    const { data: order } = await supabase
      .from("store_orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    orderId = order?.id;
  }

  if (!orderId) {
    logStore("Store order not found", { sessionId: session.id });
    return;
  }

  // 3. Update order → paid
  const { error: updateError } = await supabase
    .from("store_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending"); // Only update if still pending (idempotency)

  if (updateError) {
    logStore("Error updating order to paid", { orderId, error: updateError.message });
  } else {
    logStore("Order marked as paid", { orderId });
  }

  // 4. Consume gift card reservation if exists
  if (reservationId) {
    await consumeGiftCardReservation(supabase, reservationId, workspaceId, orderId);
  }

  // 5. Increment coupon used_count
  if (couponId) {
    const customerEmail = metadata.customer_email || session.customer_details?.email || "";

    await supabase.rpc("increment_coupon_used_count_safe", { p_coupon_id: couponId }).catch(() => {
      // Fallback: manual increment if RPC doesn't exist
      supabase
        .from("store_coupons")
        .select("used_count")
        .eq("id", couponId)
        .single()
        .then(({ data: coupon }: any) => {
          if (coupon) {
            supabase
              .from("store_coupons")
              .update({ used_count: (coupon.used_count || 0) + 1 })
              .eq("id", couponId);
          }
        });
    });

    // Record usage
    await supabase.from("store_coupon_usage").insert({
      coupon_id: couponId,
      customer_email: customerEmail,
      order_id: orderId,
      workspace_id: workspaceId,
    }).catch((err: any) => {
      logStore("Coupon usage insert error (non-blocking)", { error: String(err) });
    });

    logStore("Coupon usage recorded", { couponId });
  }

  // 6. Record stripe event for idempotency
  await recordStripeEvent(supabase, eventId, "checkout.session.completed", workspaceId, {
    source: "store",
    store_order_id: orderId,
    gift_card_reservation_id: reservationId || null,
    coupon_id: couponId || null,
  });

  logStore("Store order payment processing complete", { orderId });
}

/** Handle store order session expired */
async function handleStoreSessionExpired(
  supabase: any,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const metadata = session.metadata || {};
  const workspaceId = metadata.workspace_id;
  const storeOrderId = metadata.store_order_id;
  const reservationId = metadata.gift_card_reservation_id;

  if (!workspaceId) return;

  const alreadyProcessed = await checkEventIdempotency(supabase, eventId, workspaceId);
  if (alreadyProcessed) {
    logStore("Expired event already processed, skipping", { eventId });
    return;
  }

  // Release gift card reservation
  if (reservationId) {
    await releaseGiftCardReservation(supabase, reservationId);
  }

  // Update order status
  const orderId = storeOrderId || null;
  if (orderId) {
    await supabase
      .from("store_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending");

    logStore("Order cancelled (session expired)", { orderId });
  } else {
    // Try by stripe_session_id
    await supabase
      .from("store_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending");
  }

  await recordStripeEvent(supabase, eventId, "checkout.session.expired", workspaceId, {
    source: "store",
    store_order_id: orderId,
    reservation_released: !!reservationId,
  });

  logStore("Session expired processing complete");
}

/** Handle payment_intent.payment_failed for store */
async function handleStorePaymentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string,
) {
  const metadata = paymentIntent.metadata || {};
  const workspaceId = metadata.workspace_id;
  const storeOrderId = metadata.store_order_id;
  const reservationId = metadata.gift_card_reservation_id;

  if (!workspaceId || metadata.source !== "store") return;

  const alreadyProcessed = await checkEventIdempotency(supabase, eventId, workspaceId);
  if (alreadyProcessed) return;

  if (reservationId) {
    await releaseGiftCardReservation(supabase, reservationId);
  }

  if (storeOrderId) {
    await supabase
      .from("store_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeOrderId)
      .eq("status", "pending");

    logStore("Order cancelled (payment failed)", { orderId: storeOrderId });
  }

  await recordStripeEvent(supabase, eventId, "payment_intent.payment_failed", workspaceId, {
    source: "store",
    store_order_id: storeOrderId,
  });
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Received event", { type: event.type, id: event.id });

    // Helper to log billing events
    const logBillingEvent = async (
      eventType: string,
      workspaceId: string,
      data?: unknown
    ) => {
      await supabaseClient.from("billing_events").insert({
        workspace_id: workspaceId,
        event_type: eventType,
        data: data || null,
        processed: true,
        processed_at: new Date().toISOString(),
        stripe_event_id: event.id,
      });
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const workspaceId = metadata.workspace_id;
        const plan = metadata.plan;
        const opportunityId = metadata.opportunity_id;
        const proposalId = metadata.proposal_id;

        // ── STORE ORDER HANDLING ──
        if (metadata.source === "store") {
          logStore("Processing store checkout.session.completed", {
            sessionId: session.id,
            orderId: metadata.store_order_id,
          });
          await handleStoreOrderCompleted(supabaseClient, session, event.id);
          break; // Don't fall through to subscription/proposal logic
        }

        // ── EXISTING: Subscription & Proposal logic (unchanged) ──
        if (workspaceId && opportunityId) {
          const alreadyProcessed = await checkEventIdempotency(supabaseClient, event.id, workspaceId);
          if (alreadyProcessed) {
            logStep("Event already processed, skipping", { eventId: event.id });
            return new Response(JSON.stringify({ received: true, skipped: true }), {
              headers: { "Content-Type": "application/json" },
              status: 200,
            });
          }
        }

        if (workspaceId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const productId = subscription.items.data[0]?.price.product as string;
          const resolvedPlan = PRODUCT_TO_PLAN[productId] || plan || "basic";

          const { error } = await supabaseClient
            .from("workspace_subscriptions")
            .upsert({
              workspace_id: workspaceId,
              plan: resolvedPlan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, {
              onConflict: "workspace_id",
            });

          if (error) {
            logStep("Error upserting subscription", { error });
          } else {
            logStep("Subscription created/updated", { workspaceId, plan: resolvedPlan });
            await logBillingEvent("subscription_created", workspaceId, {
              plan: resolvedPlan,
              subscription_id: subscription.id,
            });
          }
        }

        if (workspaceId && opportunityId && session.payment_status === "paid") {
          const amount = session.amount_total || 0;

          const { error: oppError } = await supabaseClient
            .from("opportunities")
            .update({ 
              status: "won",
              updated_at: new Date().toISOString(),
            })
            .eq("id", opportunityId);

          if (oppError) {
            logStep("Error updating opportunity", { error: oppError });
          } else {
            logStep("Opportunity marked as won", { opportunityId });
          }

          if (proposalId) {
            await supabaseClient
              .from("proposals")
              .update({
                payment_status: "paid",
                accepted_at: new Date().toISOString(),
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("id", proposalId);

            logStep("Proposal payment status updated", { proposalId });
          }

          await supabaseClient.from("payments").insert({
            workspace_id: workspaceId,
            opportunity_id: opportunityId,
            amount: amount / 100,
            currency: session.currency?.toUpperCase() || "EUR",
            status: "completed",
            stripe_payment_id: session.payment_intent as string,
          });

          await recordStripeEvent(supabaseClient, event.id, event.type, workspaceId, {
            opportunityId,
            proposalId,
            amount,
          });

          await logBillingEvent("payment_completed", workspaceId, {
            amount: amount / 100,
            opportunity_id: opportunityId,
            proposal_id: proposalId,
          });

          await triggerPaymentAutomation(
            supabaseClient,
            workspaceId,
            opportunityId,
            proposalId ? "proposal_paid" : "payment_confirmed",
            {
              amount: amount / 100,
              currency: session.currency,
              proposal_id: proposalId,
              payment_intent: session.payment_intent,
            }
          );
        }
        break;
      }

      // ── STORE: Session expired ──
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        if (metadata.source === "store") {
          logStore("Processing checkout.session.expired", { sessionId: session.id });
          await handleStoreSessionExpired(supabaseClient, session, event.id);
        }
        break;
      }

      // ── STORE: Payment failed ──
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata || {};

        if (metadata.source === "store") {
          logStore("Processing payment_intent.payment_failed", { piId: paymentIntent.id });
          await handleStorePaymentFailed(supabaseClient, paymentIntent, event.id);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          const productId = subscription.items.data[0]?.price.product as string;
          const plan = PRODUCT_TO_PLAN[productId] || "basic";

          await supabaseClient
            .from("workspace_subscriptions")
            .upsert({
              workspace_id: workspaceId,
              plan,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0]?.price.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, {
              onConflict: "workspace_id",
            });

          await logBillingEvent("subscription_created", workspaceId, {
            plan,
            subscription_id: subscription.id,
          });

          logStep("Subscription created", { subscriptionId: subscription.id, plan });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspace_id;

        if (workspaceId) {
          const productId = subscription.items.data[0]?.price.product as string;
          const plan = PRODUCT_TO_PLAN[productId] || "free";
          const newPlan = event.type === "customer.subscription.deleted" ? "free" : plan;

          const { error } = await supabaseClient
            .from("workspace_subscriptions")
            .update({
              plan: newPlan,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq("stripe_subscription_id", subscription.id);

          if (error) {
            logStep("Error updating subscription", { error });
          } else {
            await logBillingEvent(
              event.type === "customer.subscription.deleted" ? "subscription_canceled" : "subscription_updated",
              workspaceId,
              { plan: newPlan, status: subscription.status }
            );
            logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const workspaceId = subscription.metadata?.workspace_id;

          await supabaseClient
            .from("workspace_subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          if (workspaceId) {
            await logBillingEvent("invoice_paid", workspaceId, {
              invoice_id: invoice.id,
              amount: (invoice.amount_paid || 0) / 100,
            });
          }

          logStep("Invoice paid", { subscriptionId: subscription.id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const workspaceId = subscription.metadata?.workspace_id;

          await supabaseClient
            .from("workspace_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription);

          if (workspaceId) {
            await supabaseClient.from("usage_alerts").insert({
              workspace_id: workspaceId,
              alert_type: "payment_failed",
              resource_type: "billing",
              threshold_percent: 100,
              message: "O pagamento da sua subscrição falhou. Por favor, atualize o método de pagamento para manter o acesso.",
            });

            await logBillingEvent("invoice_payment_failed", workspaceId, {
              invoice_id: invoice.id,
              amount: (invoice.amount_due || 0) / 100,
            });
          }

          logStep("Invoice payment failed", { subscriptionId: invoice.subscription });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
