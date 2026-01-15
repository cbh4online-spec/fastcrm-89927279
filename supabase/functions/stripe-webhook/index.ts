import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
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
  workspaceId: string
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

  // Find active automation rules for this trigger
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

  // Create automation log for each rule
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

serve(async (req) => {
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
      // For development without webhook secret
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
        const workspaceId = session.metadata?.workspace_id;
        const plan = session.metadata?.plan;
        const opportunityId = session.metadata?.opportunity_id;
        const proposalId = session.metadata?.proposal_id;

        // Check idempotency for proposal payments
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

          // Upsert subscription record
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

        // Handle proposal/opportunity payment
        if (workspaceId && opportunityId && session.payment_status === "paid") {
          const amount = session.amount_total || 0;

          // Update opportunity status to won
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

          // Update proposal payment status
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

          // Record payment
          await supabaseClient.from("payments").insert({
            workspace_id: workspaceId,
            opportunity_id: opportunityId,
            amount: amount / 100, // Convert from cents
            currency: session.currency?.toUpperCase() || "EUR",
            status: "completed",
            stripe_payment_id: session.payment_intent as string,
          });

          // Record event for idempotency
          await recordStripeEvent(supabaseClient, event.id, event.type, workspaceId, {
            opportunityId,
            proposalId,
            amount,
          });

          // Log billing event
          await logBillingEvent("payment_completed", workspaceId, {
            amount: amount / 100,
            opportunity_id: opportunityId,
            proposal_id: proposalId,
          });

          // Trigger automations
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

          // Create usage alert for payment failure
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
