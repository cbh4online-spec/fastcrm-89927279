import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-CHECKOUT] ${step}${detailsStr}`);
};

async function upsertContact(
  supabaseClient: ReturnType<typeof createClient>,
  workspaceId: string,
  name: string,
  email: string,
  phone: string | null
): Promise<string | null> {
  try {
    // Search by email first
    const { data: existing } = await supabaseClient
      .from("contacts")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Update missing fields
      const updates: Record<string, string> = {};
      if (!existing.name && name) updates.name = name;
      if (!existing.phone && phone) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        await supabaseClient.from("contacts").update(updates).eq("id", existing.id);
        logStep("Updated existing contact", { contactId: existing.id, updates });
      }
      return existing.id;
    }

    // Create new contact
    const { data: newContact, error } = await supabaseClient
      .from("contacts")
      .insert({
        workspace_id: workspaceId,
        name,
        email,
        phone: phone || null,
        source: "store",
        tags: ["loja-online"],
      })
      .select("id")
      .single();

    if (error) {
      logStep("Contact insert error", { message: error.message });
      return null;
    }

    logStep("Created new CRM contact", { contactId: newContact.id });
    return newContact.id;
  } catch (err) {
    logStep("Contact upsert error", { message: String(err) });
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    logStep("Function started");

    const {
      workspaceId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      successUrl,
      cancelUrl,
      shippingMethodId,
      shippingCost,
      shippingMethodName,
      mode: checkoutMode, // "payment" (default) or "subscription"
    } = await req.json();

    logStep("Request body", { workspaceId, itemCount: items?.length, customerEmail, mode: checkoutMode });

    if (!workspaceId) throw new Error("Workspace ID is required");
    if (!items || items.length === 0) throw new Error("Cart is empty");
    if (!customerEmail) throw new Error("Customer email is required");
    if (!customerName) throw new Error("Customer name is required");
    if (!customerPhone) throw new Error("Customer phone is required");

    // Get workspace Stripe config
    const { data: stripeConfig, error: configError } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, stripe_publishable_key, is_active, test_mode")
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

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Validate products exist and get prices from DB
    const productIds = items.map((i: { productId: string }) => i.productId);
    const { data: products, error: productsError } = await supabaseClient
      .from("products")
      .select("id, name, base_price, currency, images, primary_image_index, sku, short_description, stock_quantity, track_stock, stock_status, billing_type, billing_frequency")
      .eq("workspace_id", workspaceId)
      .eq("store_published", true)
      .eq("status", "active")
      .in("id", productIds);

    if (productsError) throw new Error("Failed to fetch products");
    if (!products || products.length === 0) throw new Error("No valid products found");

    logStep("Products validated", { count: products.length });

    // Stock validation — block checkout if insufficient stock
    for (const item of items as Array<{ productId: string; quantity: number }>) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Produto ${item.productId} não encontrado`);
      if (product.track_stock && product.stock_status === "out_of_stock") {
        throw new Error(`"${product.name}" está esgotado`);
      }
      if (product.track_stock && product.stock_quantity !== null && item.quantity > product.stock_quantity) {
        throw new Error(`Stock insuficiente para "${product.name}". Disponível: ${product.stock_quantity}`);
      }
    }

    logStep("Stock validation passed");

    // Determine if this is a subscription checkout
    const hasRecurringProduct = products.some(p => 
      p.billing_type === "recurring" || p.billing_type === "subscription" || checkoutMode === "subscription"
    );
    const sessionMode = hasRecurringProduct ? "subscription" : "payment";
    logStep("Checkout mode determined", { sessionMode, hasRecurringProduct });

    // Build line items from DB prices (never trust client prices)
    const lineItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const images = product.images as string[] | null;
      const primaryIdx = product.primary_image_index ?? 0;
      const imageUrl = images?.[primaryIdx] || images?.[0];

      const priceData: Record<string, unknown> = {
        currency: (product.currency || "EUR").toLowerCase(),
        product_data: {
          name: product.name,
          description: product.short_description || undefined,
          ...(imageUrl ? { images: [imageUrl] } : {}),
          metadata: {
            product_id: product.id,
            sku: product.sku || "",
          },
        },
        unit_amount: Math.round(product.base_price * 100),
      };

      // Add recurring interval for subscription products
      if (sessionMode === "subscription") {
        const billingFreq = (product.billing_frequency as string) || "monthly";
        const intervalMap: Record<string, string> = {
          daily: "day", weekly: "week", monthly: "month", quarterly: "month",
          semiannual: "month", yearly: "year", annual: "year",
        };
        const intervalCountMap: Record<string, number> = {
          quarterly: 3, semiannual: 6,
        };
        priceData.recurring = {
          interval: intervalMap[billingFreq] || "month",
          ...(intervalCountMap[billingFreq] ? { interval_count: intervalCountMap[billingFreq] } : {}),
        };
      }

      return { price_data: priceData, quantity: item.quantity };
    });

    // Add shipping as a line item if applicable (only for one-time payments)
    const parsedShippingCost = parseFloat(shippingCost) || 0;
    if (parsedShippingCost > 0 && sessionMode === "payment") {
      lineItems.push({
        price_data: {
          currency: (products[0]?.currency || "EUR").toLowerCase(),
          product_data: {
            name: `Envio — ${shippingMethodName || "Standard"}`,
          },
          unit_amount: Math.round(parsedShippingCost * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    // Optional auth - store checkout works for guests too
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    const sessionConfig: Record<string, unknown> = {
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: sessionMode,
      success_url: successUrl || `${origin}/store/${workspaceId}/success`,
      cancel_url: cancelUrl || `${origin}/store/${workspaceId}/cancel`,
      metadata: {
        workspace_id: workspaceId,
        user_id: userId || "",
        customer_name: customerName,
        customer_phone: customerPhone || "",
        source: "store",
      },
    };

    // Add shipping collection only for payment mode
    if (sessionMode === "payment") {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ["PT", "ES", "FR", "DE", "IT", "GB", "US", "BR"],
      };
    }

    // Add subscription metadata for recurring
    if (sessionMode === "subscription") {
      sessionConfig.subscription_data = {
        metadata: {
          workspace_id: workspaceId,
          user_id: userId || "",
          source: "store",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig as any);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Upsert contact in CRM
    const contactId = await upsertContact(
      supabaseClient,
      workspaceId,
      customerName,
      customerEmail,
      customerPhone || null
    );

    // Create store order record
    const orderItems = items.map((item: { productId: string; quantity: number; name: string; price: number }) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        product_id: item.productId,
        name: product?.name || item.name,
        quantity: item.quantity,
        unit_price: product?.base_price || item.price,
        sku: product?.sku || null,
      };
    });

    const { error: orderError } = await supabaseClient
      .from("store_orders")
      .insert({
        workspace_id: workspaceId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        user_id: userId,
        contact_id: contactId,
        items: orderItems,
        subtotal: orderItems.reduce((s: number, i: { unit_price: number; quantity: number }) => s + i.unit_price * i.quantity, 0),
        shipping_cost: parsedShippingCost,
        shipping_method_id: shippingMethodId || null,
        shipping_method_name: shippingMethodName || null,
        total: lineItems.reduce(
          (sum: number, li: { price_data: { unit_amount: number }; quantity: number }) =>
            sum + (li.price_data.unit_amount * li.quantity) / 100,
          0
        ),
        currency: (products[0]?.currency || "EUR").toUpperCase(),
        status: "pending",
        stripe_session_id: session.id,
      });

    if (orderError) {
      logStep("Order insert error (non-blocking)", { message: orderError.message });
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
