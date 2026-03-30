import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  resolveStoreProducts,
  validateCoupon,
  calculateOrderTotals,
  normalizeCurrency,
  type CartItem,
  type ValidatedCoupon,
  type PricingBreakdown,
} from "../_shared/store-pricing.ts";

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
    const { data: existing } = await supabaseClient
      .from("contacts")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, string> = {};
      if (!existing.name && name) updates.name = name;
      if (!existing.phone && phone) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        await supabaseClient.from("contacts").update(updates).eq("id", existing.id);
        logStep("Updated existing contact", { contactId: existing.id, updates });
      }
      return existing.id;
    }

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
      workspaceId,
      items,
      customerName,
      customerEmail,
      customerPhone,
      contactId: providedContactId,
      successUrl,
      cancelUrl,
      shippingMethodId,
      shippingCost,
      shippingMethodName,
      giftCardCode,
      couponCode,
      mode: checkoutMode,
      abandonedCartId,
    } = await req.json();

    logStep("Request body", {
      workspaceId,
      itemCount: items?.length,
      customerEmail,
      mode: checkoutMode,
      giftCardCode: !!giftCardCode,
      couponCode: couponCode || null,
    });

    if (!workspaceId) throw new Error("Workspace ID is required");
    if (!items || items.length === 0) throw new Error("Cart is empty");
    if (!customerEmail) throw new Error("Customer email is required");
    if (!customerName) throw new Error("Customer name is required");
    if (!customerPhone) throw new Error("Customer phone is required");

    // ── Get workspace Stripe config ──
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

    // ── FASE A: Server-side product resolution & pricing ──
    const cartItems: CartItem[] = items.map((i: any) => ({
      productId: i.productId,
      quantity: i.quantity,
      name: i.name,
      price: i.price,
    }));

    const { products, normalized } = await resolveStoreProducts(
      supabaseClient,
      workspaceId,
      cartItems,
    );

    const currency = normalizeCurrency(products);
    const parsedShippingCost = parseFloat(shippingCost) || 0;

    // ── FASE B: Backend coupon validation ──
    let validatedCoupon: ValidatedCoupon | null = null;
    const itemCategoryIds = normalized
      .map((n) => n.category_id)
      .filter((c): c is string => !!c);

    const rawSubtotal = normalized.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    if (couponCode) {
      try {
        validatedCoupon = await validateCoupon(
          supabaseClient,
          workspaceId,
          couponCode,
          customerEmail,
          rawSubtotal,
          itemCategoryIds,
        );
      } catch (couponError) {
        // Return coupon error with 400 so frontend can show it
        const msg = couponError instanceof Error ? couponError.message : String(couponError);
        logStep("Coupon validation failed", { couponCode, error: msg });
        return new Response(JSON.stringify({ error: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // ── FASE C: Gift card validation (no immediate debit) ──
    let giftCardReserved = 0;
    let giftCardId: string | null = null;
    let giftCardBalance = 0;

    if (giftCardCode) {
      const { data: gc, error: gcError } = await supabaseClient
        .from("store_gift_cards")
        .select("id, current_balance, status, expires_at")
        .eq("code", giftCardCode.toUpperCase().trim())
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();

      if (gcError || !gc) throw new Error("Gift Card inválido ou não encontrado");
      if (gc.expires_at && new Date(gc.expires_at) < new Date())
        throw new Error("Gift Card expirado");
      if (gc.current_balance <= 0) throw new Error("Gift Card sem saldo");

      giftCardId = gc.id;
      giftCardBalance = gc.current_balance;
    }

    // ── Calculate totals using pricing engine ──
    // First pass without gift card to know the amount available for GC
    const preGcBreakdown = calculateOrderTotals(
      normalized,
      validatedCoupon,
      parsedShippingCost,
      0, // no GC yet
      currency,
    );

    // Determine gift card reservation amount
    if (giftCardId && giftCardBalance > 0) {
      giftCardReserved = Math.min(giftCardBalance, preGcBreakdown.total_payable);
      giftCardReserved = Math.round(giftCardReserved * 100) / 100;
    }

    // Final breakdown with gift card
    const breakdown: PricingBreakdown = calculateOrderTotals(
      normalized,
      validatedCoupon,
      parsedShippingCost,
      giftCardReserved,
      currency,
    );

    logStep("Final pricing", {
      subtotal: breakdown.subtotal,
      discount: breakdown.discount_amount,
      shipping: breakdown.shipping_amount,
      gcReserved: breakdown.gift_card_reserved,
      totalPayable: breakdown.total_payable,
    });

    // ── Determine checkout mode ──
    const hasRecurringProduct = products.some(
      (p: any) =>
        p.billing_type === "recurring" ||
        p.billing_type === "subscription" ||
        checkoutMode === "subscription",
    );
    const sessionMode = hasRecurringProduct ? "subscription" : "payment";

    // ── Stripe customer lookup ──
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // ── Optional auth ──
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    // ── CRM contact ──
    const contactId =
      providedContactId ||
      (await upsertContact(supabaseClient, workspaceId, customerName, customerEmail, customerPhone || null));

    // ── FASE C: Gift card covers full amount → immediate consume ──
    if (giftCardId && breakdown.total_payable <= 0) {
      logStep("Gift card covers full amount, skipping Stripe");

      // Debit gift card immediately (no Stripe involved)
      const { data: gc } = await supabaseClient
        .from("store_gift_cards")
        .select("current_balance")
        .eq("id", giftCardId)
        .single();

      const newBalance = gc!.current_balance - giftCardReserved;
      await supabaseClient
        .from("store_gift_cards")
        .update({
          current_balance: newBalance,
          status: newBalance <= 0 ? "depleted" : "active",
        })
        .eq("id", giftCardId);

      await supabaseClient.from("store_gift_card_transactions").insert({
        gift_card_id: giftCardId,
        workspace_id: workspaceId,
        amount: giftCardReserved,
        balance_before: gc!.current_balance,
        balance_after: newBalance,
        description: `Pagamento completo via Gift Card`,
      });

      // Create paid order
      const { data: order, error: orderError } = await supabaseClient
        .from("store_orders")
        .insert({
          workspace_id: workspaceId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          user_id: userId,
          contact_id: contactId,
          items: breakdown.items_normalized,
          subtotal: breakdown.subtotal,
          discount_amount: breakdown.discount_amount,
          shipping_cost: breakdown.shipping_amount,
          shipping_method_id: shippingMethodId || null,
          shipping_method_name: shippingMethodName || null,
          total: breakdown.subtotal - breakdown.discount_amount + breakdown.shipping_amount,
          currency: breakdown.currency,
          status: "paid",
          paid_at: new Date().toISOString(),
          coupon_id: breakdown.coupon_id,
          coupon_code: breakdown.coupon_code,
          gift_card_id: giftCardId,
          gift_card_reserved_amount: giftCardReserved,
          pricing_breakdown: breakdown as any,
          source: "store",
          abandoned_cart_id: abandonedCartId || null,
        })
        .select("id")
        .single();

      if (orderError) logStep("Order insert error", { message: orderError.message });

      // Create consumed reservation record for audit
      if (order) {
        await supabaseClient.from("store_gift_card_reservations").insert({
          workspace_id: workspaceId,
          gift_card_id: giftCardId,
          store_order_id: order.id,
          amount_reserved: giftCardReserved,
          status: "consumed",
          consumed_at: new Date().toISOString(),
        });
      }

      // Increment coupon used_count if applicable
      if (validatedCoupon) {
        await supabaseClient
          .from("store_coupons")
          .update({ used_count: validatedCoupon.used_count + 1 })
          .eq("id", validatedCoupon.id);

        await supabaseClient.from("store_coupon_usage").insert({
          coupon_id: validatedCoupon.id,
          customer_email: customerEmail,
          order_id: order?.id,
          workspace_id: workspaceId,
        });
      }

      return new Response(JSON.stringify({ success: true, paidWithGiftCard: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── FASE C: Gift card partial → create RESERVATION (no debit yet) ──
    let reservationId: string | null = null;

    if (giftCardId && giftCardReserved > 0) {
      logStep("[STORE-GIFTCARD] Creating reservation", {
        giftCardId,
        amount: giftCardReserved,
      });

      const { data: reservation, error: resError } = await supabaseClient
        .from("store_gift_card_reservations")
        .insert({
          workspace_id: workspaceId,
          gift_card_id: giftCardId,
          amount_reserved: giftCardReserved,
          status: "reserved",
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h
        })
        .select("id")
        .single();

      if (resError) {
        logStep("[STORE-GIFTCARD] Reservation insert error", { message: resError.message });
        throw new Error("Erro ao reservar Gift Card");
      }

      reservationId = reservation.id;
      logStep("[STORE-GIFTCARD] Reservation created", { reservationId });
    }

    // ── Build Stripe line items ──
    let lineItems: any[];

    if (giftCardReserved > 0) {
      // When GC partial, create single line item for remaining amount
      lineItems = [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `Encomenda (restante após Gift Card)` },
            unit_amount: Math.round(breakdown.total_payable * 100),
          },
          quantity: 1,
        },
      ];
    } else {
      // Standard line items from products
      lineItems = normalized.map((item) => {
        const product = products.find((p: any) => p.id === item.product_id)!;
        const images = product.images as string[] | null;
        const primaryIdx = product.primary_image_index ?? 0;
        const imageUrl = images?.[primaryIdx] || images?.[0];

        const priceData: Record<string, unknown> = {
          currency: currency.toLowerCase(),
          product_data: {
            name: product.name,
            description: product.short_description || undefined,
            ...(imageUrl ? { images: [imageUrl] } : {}),
            metadata: { product_id: product.id, sku: product.sku || "" },
          },
          unit_amount: Math.round(product.base_price * 100),
        };

        if (sessionMode === "subscription") {
          const billingFreq = (product.billing_frequency as string) || "monthly";
          const intervalMap: Record<string, string> = {
            daily: "day", weekly: "week", monthly: "month", quarterly: "month",
            semiannual: "month", yearly: "year", annual: "year",
          };
          const intervalCountMap: Record<string, number> = { quarterly: 3, semiannual: 6 };
          priceData.recurring = {
            interval: intervalMap[billingFreq] || "month",
            ...(intervalCountMap[billingFreq] ? { interval_count: intervalCountMap[billingFreq] } : {}),
          };
        }

        return { price_data: priceData, quantity: item.quantity };
      });

      // Discount as negative line item (if applicable and no GC)
      if (breakdown.discount_amount > 0) {
        // Use Stripe coupon/discount via line items — subtract from total
        // We create a single line item for the discounted total instead
        const totalBeforeShipping = breakdown.subtotal - breakdown.discount_amount;
        lineItems = [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: lineItems.length === 1
                  ? normalized[0].name
                  : `Encomenda (${normalized.length} produtos)`,
              },
              unit_amount: Math.round(totalBeforeShipping * 100),
            },
            quantity: 1,
          },
        ];
      }

      // Add shipping line item (payment mode only)
      if (parsedShippingCost > 0 && sessionMode === "payment") {
        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `Envio — ${shippingMethodName || "Standard"}` },
            unit_amount: Math.round(parsedShippingCost * 100),
          },
          quantity: 1,
        });
      }
    }

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    // ── Create store_order (pending) ──
    const { data: order, error: orderError } = await supabaseClient
      .from("store_orders")
      .insert({
        workspace_id: workspaceId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        user_id: userId,
        contact_id: contactId,
        items: breakdown.items_normalized,
        subtotal: breakdown.subtotal,
        discount_amount: breakdown.discount_amount,
        shipping_cost: breakdown.shipping_amount,
        shipping_method_id: shippingMethodId || null,
        shipping_method_name: shippingMethodName || null,
        total: breakdown.total_payable,
        currency: breakdown.currency,
        status: "pending",
        coupon_id: breakdown.coupon_id,
        coupon_code: breakdown.coupon_code,
        gift_card_id: giftCardId,
        gift_card_reserved_amount: giftCardReserved,
        pricing_breakdown: breakdown as any,
        source: "store",
        abandoned_cart_id: abandonedCartId || null,
      })
      .select("id")
      .single();

    if (orderError) {
      logStep("Order insert error", { message: orderError.message });
    }

    const orderId = order?.id || null;

    // Link reservation to order
    if (reservationId && orderId) {
      await supabaseClient
        .from("store_gift_card_reservations")
        .update({ store_order_id: orderId })
        .eq("id", reservationId);
    }

    // ── Create Stripe Checkout Session ──
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
        customer_email: customerEmail,
        source: "store",
        store_order_id: orderId || "",
        gift_card_id: giftCardId || "",
        gift_card_reservation_id: reservationId || "",
        gift_card_deduction: giftCardReserved.toString(),
        coupon_id: validatedCoupon?.id || "",
        coupon_code: validatedCoupon?.code || "",
        abandoned_cart_id: abandonedCartId || "",
      },
    };

    if (sessionMode === "payment") {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ["PT", "ES", "FR", "DE", "IT", "GB", "US", "BR"],
      };
    }

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

    // Update order and reservation with stripe_session_id
    if (orderId) {
      await supabaseClient
        .from("store_orders")
        .update({ stripe_session_id: session.id })
        .eq("id", orderId);
    }
    if (reservationId) {
      await supabaseClient
        .from("store_gift_card_reservations")
        .update({ stripe_session_id: session.id })
        .eq("id", reservationId);
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
