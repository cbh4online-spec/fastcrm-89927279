import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[C2C-CHECKOUT] ${step}${detailsStr}`);
};

const COMMISSION_RATE = 0.05; // 5%

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    logStep("Function started");

    const {
      listingId, workspaceId, buyerEmail, buyerName, successUrl, cancelUrl,
      shippingMethod, shippingPrice, shippingCarrier, meetupLocation
    } = await req.json();
    logStep("Request body", { listingId, workspaceId, shippingMethod, shippingPrice });

    if (!listingId) throw new Error("Listing ID is required");
    if (!workspaceId) throw new Error("Workspace ID is required");

    // Optional auth - get buyer user id if logged in
    let buyerUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      buyerUserId = userData?.user?.id || null;
      logStep("Buyer authenticated", { buyerUserId });
    }

    // Get listing with seller info
    const { data: listing, error: listingError } = await supabaseClient
      .from("c2c_listings")
      .select("id, title, description, price, currency, photos, seller_id, status, workspace_id, delivery_mode")
      .eq("id", listingId)
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .single();

    if (listingError || !listing) {
      throw new Error("Anúncio não encontrado ou já não está disponível");
    }

    logStep("Listing loaded", { title: listing.title, price: listing.price, sellerId: listing.seller_id });

    // Prevent buying own listing
    if (buyerUserId && buyerUserId === listing.seller_id) {
      throw new Error("Não podes comprar o teu próprio anúncio");
    }

    // Get seller info
    const { data: seller, error: sellerError } = await supabaseClient
      .from("c2c_sellers")
      .select("id, display_name, status, commission_rate")
      .eq("user_id", listing.seller_id)
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .single();

    if (sellerError || !seller) {
      throw new Error("Vendedor não encontrado ou não aprovado");
    }

    const commissionRate = seller.commission_rate || COMMISSION_RATE * 100;
    logStep("Seller loaded", { sellerId: seller.id, commissionRate });

    // Get workspace Stripe config
    const { data: stripeConfig, error: configError } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, is_active, test_mode")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (configError || !stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe não configurado para este workspace");
    }

    logStep("Stripe config loaded", { testMode: stripeConfig.test_mode });

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted, {
      apiVersion: "2025-08-27.basil",
    });

    // Resolve buyer email
    const email = buyerEmail || (buyerUserId ? (await supabaseClient.auth.getUser(authHeader!.replace("Bearer ", ""))).data.user?.email : null);
    if (!email) throw new Error("Email do comprador é obrigatório");

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const photos = listing.photos as string[] | null;
    const imageUrl = photos?.[0];
    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    // Calculate total with shipping
    const itemPrice = listing.price;
    const shipCost = typeof shippingPrice === 'number' ? shippingPrice : 0;
    const totalPrice = itemPrice + shipCost;

    const lineItems: any[] = [
      {
        price_data: {
          currency: (listing.currency || "EUR").toLowerCase(),
          product_data: {
            name: listing.title,
            description: listing.description?.substring(0, 200) || undefined,
            ...(imageUrl ? { images: [imageUrl] } : {}),
            metadata: { listing_id: listing.id, seller_id: seller.id },
          },
          unit_amount: Math.round(itemPrice * 100),
        },
        quantity: 1,
      },
    ];

    // Add shipping as separate line item if applicable
    if (shipCost > 0 && shippingMethod !== 'in_person') {
      lineItems.push({
        price_data: {
          currency: (listing.currency || "EUR").toLowerCase(),
          product_data: {
            name: `Envio — ${shippingCarrier || shippingMethod || 'Postal'}`,
          },
          unit_amount: Math.round(shipCost * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl || `${origin}/dashboard/c2c/orders?success=true&listing=${listingId}`,
      cancel_url: cancelUrl || `${origin}/dashboard/c2c/${listingId}`,
      metadata: {
        type: "c2c_purchase",
        workspace_id: workspaceId,
        listing_id: listingId,
        seller_c2c_id: seller.id,
        seller_user_id: listing.seller_id,
        buyer_user_id: buyerUserId || "",
        commission_rate: commissionRate.toString(),
        sale_amount: itemPrice.toString(),
        shipping_method: shippingMethod || "",
        shipping_price: shipCost.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Mark listing as reserved (pending sale)
    await supabaseClient
      .from("c2c_listings")
      .update({ status: "paused" })
      .eq("id", listingId);

    // Pre-create commission record as pending
    const saleAmount = itemPrice;
    const commissionAmount = saleAmount * (commissionRate / 100);
    const sellerAmount = saleAmount - commissionAmount;

    const { data: commissionData, error: commissionError } = await supabaseClient
      .from("c2c_commissions")
      .insert({
        workspace_id: workspaceId,
        seller_id: seller.id,
        listing_id: listingId,
        buyer_id: buyerUserId,
        sale_amount: saleAmount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_amount: sellerAmount,
        currency: (listing.currency || "EUR").toUpperCase(),
        status: "pending",
      })
      .select("id")
      .single();

    if (commissionError) {
      logStep("Commission insert error (non-blocking)", { message: commissionError.message });
    } else {
      logStep("Commission record created", { commissionAmount, sellerAmount });
    }

    // Create order record
    const { error: orderError } = await supabaseClient
      .from("c2c_orders")
      .insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        buyer_id: buyerUserId || '00000000-0000-0000-0000-000000000000',
        seller_id: listing.seller_id,
        seller_c2c_id: seller.id,
        item_price: itemPrice,
        shipping_price: shipCost,
        total_price: totalPrice,
        currency: (listing.currency || "EUR").toUpperCase(),
        shipping_method: shippingMethod || null,
        shipping_carrier: shippingCarrier || null,
        delivery_mode: shippingMethod === 'in_person' ? 'in_person' : 'shipping',
        meetup_location: meetupLocation || null,
        status: "pending",
        payment_status: "pending",
        stripe_session_id: session.id,
        commission_id: commissionData?.id || null,
      });

    if (orderError) {
      logStep("Order insert error (non-blocking)", { message: orderError.message });
    } else {
      logStep("Order record created");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
