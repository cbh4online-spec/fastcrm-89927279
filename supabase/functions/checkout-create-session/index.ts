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
    const currency = String(settings.currency || "EUR").toLowerCase();
    const rawProducts: any[] = Array.isArray(settings.products) && settings.products.length
      ? settings.products
      : [{ name: funnel.name, price: Number(settings.price) || 0, quantity: 1 }];

    // Enrich lines from the catalog when they are linked to a product
    const productIds = rawProducts.map((p: any) => p.product_id).filter(Boolean);
    const catalog = new Map<string, any>();
    if (productIds.length) {
      const { data: catalogRows } = await supabase
        .from("products")
        .select("id, name, sku, short_description, product_images(url)")
        .in("id", productIds);
      for (const row of catalogRows || []) catalog.set(row.id, row);
    }

    const products = rawProducts.map((p: any) => {
      const cat = p.product_id ? catalog.get(p.product_id) : null;
      return {
        product_id: p.product_id ?? null,
        name: String(p.name || cat?.name || "Produto"),
        sku: p.sku ?? cat?.sku ?? null,
        quantity: Number(p.quantity) > 0 ? Math.floor(Number(p.quantity)) : 1,
        price: Number(p.price) || 0,
        tax_rate: p.tax_rate == null ? 23 : Number(p.tax_rate) || 0,
        image_url: p.image_url ?? cat?.product_images?.[0]?.url ?? null,
        description: cat?.short_description ?? null,
      };
    });

    const invalid = products.some((p: any) => !(p.price > 0) || !(p.quantity > 0));
    const itemsTotal = products.reduce((s: number, p: any) => s + p.price * p.quantity, 0);
    if (invalid || itemsTotal <= 0) {
      throw new Error("Este funil não tem produtos com preço válido configurado");
    }

    const toLineItem = (name: string, unitPrice: number, quantity: number, imageUrl?: string | null, description?: string | null) => ({
      price_data: {
        currency,
        product_data: {
          name,
          ...(description ? { description: String(description).slice(0, 500) } : {}),
          ...(imageUrl && /^https?:\/\//.test(imageUrl) ? { images: [imageUrl] } : {}),
        },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity,
    });

    const lineItems: any[] = products.map((p: any) =>
      toLineItem(p.name, p.price, p.quantity, p.image_url, p.description)
    );

    // Add accepted bumps
    const acceptedBumpLines: any[] = [];
    if (acceptedBumps?.length) {
      const { data: bumpOffers } = await supabase
        .from("checkout_offers")
        .select("*")
        .in("id", acceptedBumps)
        .eq("workspace_id", workspaceId);

      for (const offer of (bumpOffers || [])) {
        const price = Number(offer.price) || 0;
        if (price <= 0) continue;
        acceptedBumpLines.push({ offer_id: offer.id, name: offer.name, price, product_id: offer.product_id ?? null });
        lineItems.push(toLineItem(offer.name, price, 1, offer.image_url, offer.description));
      }
    }

    // Funnel-level discount
    const grossTotal = lineItems.reduce((s: number, li: any) => s + (li.price_data.unit_amount * li.quantity) / 100, 0);
    const discountCfg = settings.discount || null;
    let discountValue = 0;
    if (discountCfg?.type === "fixed") discountValue = Number(discountCfg.value) || 0;
    if (discountCfg?.type === "percent") discountValue = (grossTotal * (Number(discountCfg.value) || 0)) / 100;
    discountValue = Math.max(0, Math.min(discountValue, grossTotal));

    let discounts: any[] | undefined;
    if (discountValue > 0.005) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountValue * 100),
        currency,
        duration: "once",
        name: String(discountCfg?.label || "Desconto").slice(0, 40),
      });
      discounts = [{ coupon: coupon.id }];
    }

    const totalValue = Math.round((grossTotal - discountValue) * 100) / 100;

    const { data: session } = await supabase
      .from("checkout_sessions")
      .insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        customer_email: customerEmail,
        customer_name: customerName,
        status: "started",
        current_step: "checkout",
        cart_data: {
          products,
          bumps: acceptedBumpLines,
          currency,
          discount: discountValue ? { ...discountCfg, amount: discountValue } : null,
          shippingAddress,
          phone,
        },
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
      ...(discounts ? { discounts } : {}),
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
