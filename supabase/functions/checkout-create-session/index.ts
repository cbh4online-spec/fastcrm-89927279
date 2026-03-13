import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { funnelId, workspaceId, customerEmail, customerName, phone, shippingAddress, acceptedBumps, utmSource, utmMedium, utmCampaign } = body;

    if (!funnelId || !workspaceId || !customerEmail) {
      throw new Error("Missing required fields");
    }

    // Get workspace Stripe config
    const { data: stripeConfig } = await supabase
      .from("workspace_stripe_config")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (!stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe not configured for this workspace");
    }

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, { apiVersion: "2025-08-27.basil" });

    // Get funnel
    const { data: funnel } = await supabase
      .from("checkout_funnels")
      .select("*")
      .eq("id", funnelId)
      .single();

    if (!funnel) throw new Error("Funnel not found");

    const settings = funnel.settings || {};
    const products = settings.products || [{ name: funnel.name, price: settings.price || 0, quantity: 1 }];

    // Build line items
    const lineItems: any[] = products.map((p: any) => ({
      price_data: {
        currency: (settings.currency || "EUR").toLowerCase(),
        product_data: { name: p.name },
        unit_amount: Math.round(p.price * 100),
      },
      quantity: p.quantity || 1,
    }));

    // Add accepted bumps
    if (acceptedBumps?.length) {
      const { data: bumpOffers } = await supabase
        .from("checkout_offers")
        .select("*")
        .in("id", acceptedBumps);

      for (const offer of (bumpOffers || [])) {
        lineItems.push({
          price_data: {
            currency: (offer.currency || "EUR").toLowerCase(),
            product_data: { name: offer.name },
            unit_amount: Math.round(offer.price * 100),
          },
          quantity: 1,
        });
      }
    }

    // Create checkout session record
    const totalValue = lineItems.reduce((s: number, li: any) => s + (li.price_data.unit_amount * li.quantity) / 100, 0);

    const { data: session } = await supabase
      .from("checkout_sessions")
      .insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        customer_email: customerEmail,
        customer_name: customerName,
        status: "started",
        current_step: "checkout",
        cart_data: { products, shippingAddress, phone },
        bumps_accepted: acceptedBumps || [],
        total_value: totalValue,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select()
      .single();

    // Determine next step (upsell or thank_you)
    const { data: steps } = await supabase
      .from("checkout_funnel_steps")
      .select("*")
      .eq("funnel_id", funnelId)
      .order("step_order");

    const upsellStep = (steps || []).find((s: any) => s.step_type === "upsell");
    const origin = req.headers.get("origin") || "";

    let successUrl = `${origin}/checkout/${funnel.slug}/thank-you?session=${session?.id}`;
    if (upsellStep?.offer_id) {
      successUrl = `${origin}/checkout/${funnel.slug}/upsell/${upsellStep.offer_id}?session=${session?.id}`;
    }

    // Check existing Stripe customer
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${origin}/checkout/${funnel.slug}?canceled=true`,
      metadata: {
        checkout_session_id: session?.id,
        funnel_id: funnelId,
        workspace_id: workspaceId,
      },
      payment_intent_data: {
        metadata: {
          checkout_session_id: session?.id,
          funnel_id: funnelId,
        },
        setup_future_usage: "off_session",
      },
    });

    // Update session with Stripe IDs
    if (session?.id) {
      await supabase
        .from("checkout_sessions")
        .update({
          stripe_session_id: stripeSession.id,
          status: "checkout_completed",
        })
        .eq("id", session.id);
    }

    return new Response(JSON.stringify({ url: stripeSession.url, sessionId: session?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
