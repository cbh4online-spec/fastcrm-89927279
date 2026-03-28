import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_RENEWAL_WEBHOOK_SECRET");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret) as Stripe.Event;
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`[RENEWAL-WEBHOOK] Event: ${event.type}, ID: ${event.id}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractId = session.metadata?.contract_id;
        const workspaceId = session.metadata?.workspace_id;

        if (!contractId || !workspaceId) {
          console.log("[RENEWAL-WEBHOOK] No contract metadata, skipping");
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Update contract with Stripe IDs
        await db.from("renewal_contracts").update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
        }).eq("id", contractId);

        // Update payment link status
        await db.from("renewal_payment_links")
          .update({ status: "paid" })
          .eq("stripe_session_id", session.id);

        // Record event
        await db.from("renewal_payment_events").insert({
          workspace_id: workspaceId,
          contract_id: contractId,
          stripe_event_id: event.id,
          event_type: "subscription_created",
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          stripe_subscription_id: subscriptionId,
          metadata: { session_id: session.id, customer_id: customerId },
        });

        // Link to SaaS — upsert workspace_subscriptions
        await db.from("workspace_subscriptions").upsert({
          workspace_id: workspaceId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: "active",
          plan: "renewal_contract",
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" });

        console.log(`[RENEWAL-WEBHOOK] Subscription ${subscriptionId} linked to contract ${contractId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Find contract by stripe_subscription_id
        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) {
          console.log(`[RENEWAL-WEBHOOK] No contract for subscription ${subscriptionId}`);
          break;
        }

        // Record payment event
        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "payment_succeeded",
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency?.toUpperCase() || "EUR",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          metadata: { invoice_number: invoice.number, period_start: invoice.period_start, period_end: invoice.period_end },
        });

        // Update contract status
        await db.from("renewal_contracts")
          .update({ status: "active", risk_level: "low" })
          .eq("id", contract.id);

        console.log(`[RENEWAL-WEBHOOK] Payment recorded for contract ${contract.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) break;

        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "payment_failed",
          amount: (invoice.amount_due || 0) / 100,
          currency: invoice.currency?.toUpperCase() || "EUR",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          metadata: { attempt_count: invoice.attempt_count },
        });

        // Increase risk level
        await db.from("renewal_contracts")
          .update({ risk_level: "high" })
          .eq("id", contract.id);

        console.log(`[RENEWAL-WEBHOOK] Payment FAILED for contract ${contract.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const { data: contract } = await db.from("renewal_contracts")
          .select("id, workspace_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (!contract) break;

        await db.from("renewal_payment_events").insert({
          workspace_id: contract.workspace_id,
          contract_id: contract.id,
          stripe_event_id: event.id,
          event_type: "subscription_cancelled",
          stripe_subscription_id: subscriptionId,
          metadata: { canceled_at: subscription.canceled_at },
        });

        await db.from("renewal_contracts")
          .update({ status: "churned" })
          .eq("id", contract.id);

        // Update SaaS subscription status
        await db.from("workspace_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);

        console.log(`[RENEWAL-WEBHOOK] Subscription cancelled for contract ${contract.id}`);
        break;
      }

      default:
        console.log(`[RENEWAL-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[RENEWAL-WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
