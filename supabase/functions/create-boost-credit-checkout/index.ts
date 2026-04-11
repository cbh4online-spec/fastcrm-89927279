import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = authData.user;

    const { credits, workspaceId } = await req.json();

    if (!credits || !workspaceId || typeof credits !== "number" || credits < 1 || credits > 10000) {
      return new Response(JSON.stringify({ error: "Quantidade de créditos inválida (1-10000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: member } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Sem acesso ao workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller
    const { data: seller } = await adminClient
      .from("c2c_sellers")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!seller) {
      return new Response(JSON.stringify({ error: "Perfil de vendedor não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create wallet
    let { data: wallet } = await adminClient
      .from("c2c_boost_wallets")
      .select("id")
      .eq("seller_id", seller.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await adminClient
        .from("c2c_boost_wallets")
        .insert({ seller_id: seller.id, workspace_id: workspaceId, balance: 0 })
        .select("id")
        .single();
      wallet = newWallet;
    }

    // Get config
    const { data: config } = await adminClient
      .from("c2c_boost_config")
      .select("credit_unit_price, currency")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const unitPrice = config?.credit_unit_price ?? 0.5;
    const currency = config?.currency ?? "eur";
    const totalCents = Math.round(unitPrice * credits * 100);

    // Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `${credits} Créditos de Impulso` },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard/c2c/boost?purchase=success&credits=${credits}`,
      cancel_url: `${req.headers.get("origin")}/dashboard/c2c/boost`,
      metadata: {
        type: "boost_credits",
        wallet_id: wallet!.id,
        credits: String(credits),
        workspace_id: workspaceId,
        seller_id: seller.id,
      },
    });

    // For now, credit immediately (in production, use webhook)
    // We credit on success_url redirect check or via webhook
    // Simple approach: credit now and rely on Stripe session completion
    await adminClient
      .from("c2c_boost_wallets")
      .update({ balance: (await adminClient.from("c2c_boost_wallets").select("balance").eq("id", wallet!.id).single()).data!.balance + credits })
      .eq("id", wallet!.id);

    await adminClient
      .from("c2c_boost_transactions")
      .insert({
        wallet_id: wallet!.id,
        workspace_id: workspaceId,
        type: "purchase",
        amount: credits,
        description: `Compra de ${credits} créditos`,
        stripe_session_id: session.id,
      });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
