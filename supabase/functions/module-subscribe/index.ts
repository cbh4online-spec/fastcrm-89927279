import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[MODULE-SUBSCRIBE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Fallback: parse body directly (dev mode)
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata;

      if (meta?.type !== "module_subscription") {
        logStep("Not a module subscription checkout, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { workspace_id, module_id, module_slug, user_id } = meta;
      const stripeSubId = session.subscription as string;

      logStep("Activating module", { workspace_id, module_id, module_slug });

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Activate installation
      await supabase.from("workspace_modules").upsert({
        workspace_id,
        module_id,
        status: "active",
        pricing_model: "monthly",
        stripe_sub_id: stripeSubId,
        subscribed_by: user_id,
        subscribed_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        billing_cycle_start: now.toISOString(),
        billing_cycle_end: periodEnd.toISOString(),
      }, { onConflict: "workspace_id,module_id" });

      logStep("Module activated via webhook", { module_slug, stripeSubId });
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const meta = subscription.metadata;

      if (meta?.type !== "module_subscription") {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { workspace_id, module_id } = meta;

      if (event.type === "customer.subscription.deleted") {
        logStep("Cancelling module", { workspace_id, module_id });
        await supabase.from("workspace_modules")
          .update({ status: "canceled", cancelled_at: new Date().toISOString() })
          .eq("workspace_id", workspace_id)
          .eq("module_id", module_id);
      }

      if (event.type === "customer.subscription.updated" && subscription.cancel_at_period_end) {
        logStep("Module set to cancel at period end", { workspace_id, module_id });
        await supabase.from("workspace_modules")
          .update({ cancel_at_period_end: true })
          .eq("workspace_id", workspace_id)
          .eq("module_id", module_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
