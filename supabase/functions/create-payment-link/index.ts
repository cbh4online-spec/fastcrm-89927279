import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Use service role client for all DB queries (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Auth via getUser (standard pattern)
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[CREATE-PAYMENT-LINK] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const { productId, workspaceId } = await req.json();
    if (!productId || !workspaceId) {
      return new Response(JSON.stringify({ error: "productId and workspaceId are required" }), { status: 400, headers: corsHeaders });
    }

    // Verify workspace membership
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), { status: 403, headers: corsHeaders });
    }

    // Fetch product using admin client (no RLS issues)
    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("id, name, base_price, currency")
      .eq("id", productId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (productError) {
      console.error("[CREATE-PAYMENT-LINK] Product query error:", productError.message);
      return new Response(JSON.stringify({ error: "Product query failed" }), { status: 500, headers: corsHeaders });
    }
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: corsHeaders });
    }

    // Get Stripe key
    const { data: stripeConfig } = await adminClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const stripeKey = stripeConfig?.stripe_secret_key_encrypted || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 400, headers: corsHeaders });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const productName = product.name;
    const price = product.base_price ?? 0;
    const currency = (product.currency || "eur").toLowerCase();

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency,
          product_data: { name: productName },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin") || "https://fastcrm.lovable.app"}/payment-success`,
      cancel_url: `${req.headers.get("origin") || "https://fastcrm.lovable.app"}/payment-canceled`,
    });

    return new Response(JSON.stringify({ url: session.url, productName, price, currency }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-PAYMENT-LINK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});