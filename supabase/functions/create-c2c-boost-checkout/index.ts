import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[C2C-BOOST-CHECKOUT] ${step}${detailsStr}`);
};

// Boost pricing (in cents)
const BOOST_PRICES = {
  "7days": { amount: 299, label: "Destaque 7 dias", days: 7 },
  "14days": { amount: 499, label: "Destaque 14 dias", days: 14 },
  "30days": { amount: 799, label: "Destaque 30 dias", days: 30 },
};

const PREMIUM_PRICE = {
  amount: 999, // €9.99/month
  label: "Vendedor Premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Utilizador não autenticado");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { type, workspaceId, listingId, boostDuration } = await req.json();
    logStep("Request", { type, workspaceId, listingId, boostDuration });

    if (!workspaceId) throw new Error("Workspace ID obrigatório");
    if (!type || !["boost", "premium"].includes(type)) throw new Error("Tipo inválido");

    // Get seller profile
    const { data: seller, error: sellerError } = await supabaseClient
      .from("c2c_sellers")
      .select("id, display_name, status")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .single();

    if (sellerError || !seller) throw new Error("Vendedor não aprovado");
    logStep("Seller found", { sellerId: seller.id });

    // Get workspace Stripe config
    const { data: stripeConfig, error: configError } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (configError || !stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe não configurado");
    }

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, {
      apiVersion: "2025-08-27.basil",
    });

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: seller.display_name,
        metadata: { seller_id: seller.id, workspace_id: workspaceId },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    if (type === "boost") {
      // One-time boost payment
      if (!listingId) throw new Error("Listing ID obrigatório para boost");
      const duration = boostDuration as keyof typeof BOOST_PRICES;
      if (!BOOST_PRICES[duration]) throw new Error("Duração de boost inválida");

      const boost = BOOST_PRICES[duration];

      // Verify listing belongs to seller
      const { data: listing } = await supabaseClient
        .from("c2c_listings")
        .select("id, title")
        .eq("id", listingId)
        .eq("seller_id", user.id)
        .single();

      if (!listing) throw new Error("Anúncio não encontrado");

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `${boost.label} — ${listing.title}`,
              metadata: { listing_id: listingId, seller_id: seller.id },
            },
            unit_amount: boost.amount,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/dashboard/c2c/my-listings?boost=success`,
        cancel_url: `${origin}/dashboard/c2c/my-listings?boost=cancelled`,
        metadata: {
          type: "c2c_boost",
          workspace_id: workspaceId,
          listing_id: listingId,
          seller_id: seller.id,
          boost_days: boost.days.toString(),
        },
      });

      // Pre-create sponsored listing as pending
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + boost.days * 24 * 60 * 60 * 1000);

      await supabaseClient.from("c2c_sponsored_listings").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        seller_id: seller.id,
        amount_paid: boost.amount / 100,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: false, // Activated after payment
        stripe_payment_id: session.id,
      });

      logStep("Boost checkout created", { sessionId: session.id });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (type === "premium") {
      // Recurring premium subscription
      // Check if already has active subscription
      const { data: existingSub } = await supabaseClient
        .from("c2c_seller_subscriptions")
        .select("id, status")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingSub) throw new Error("Já tens uma subscrição premium ativa");

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: PREMIUM_PRICE.label,
              description: "Badge Premium, comissão reduzida (3%), +5 anúncios, suporte prioritário",
              metadata: { seller_id: seller.id },
            },
            unit_amount: PREMIUM_PRICE.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${origin}/dashboard/c2c/my-listings?premium=success`,
        cancel_url: `${origin}/dashboard/c2c/my-listings?premium=cancelled`,
        metadata: {
          type: "c2c_premium",
          workspace_id: workspaceId,
          seller_id: seller.id,
        },
        subscription_data: {
          metadata: {
            type: "c2c_premium",
            workspace_id: workspaceId,
            seller_id: seller.id,
          },
        },
      });

      // Pre-create subscription as pending
      await supabaseClient.from("c2c_seller_subscriptions").insert({
        workspace_id: workspaceId,
        seller_id: seller.id,
        plan: "premium",
        status: "pending",
        stripe_subscription_id: session.id,
        stripe_customer_id: customerId,
        price_amount: PREMIUM_PRICE.amount / 100,
      });

      logStep("Premium checkout created", { sessionId: session.id });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Tipo inválido");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
