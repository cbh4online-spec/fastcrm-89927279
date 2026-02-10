import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SPONSOR-CHECKOUT] ${step}${detailsStr}`);
};

// Sponsor tier pricing (in cents, per month)
const TIER_PRICES: Record<string, { amount: number; label: string; features: string }> = {
  bronze: { amount: 1999, label: "Parceiro Bronze", features: "Logo no rodapé, link para website" },
  silver: { amount: 4999, label: "Parceiro Silver", features: "Logo destacado, descrição, link, posição prioritária" },
  gold: { amount: 9999, label: "Parceiro Gold", features: "Logo grande, descrição, link, posição topo, banner dedicado" },
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

    const { workspaceId, applicationId, tier } = await req.json();
    logStep("Request", { workspaceId, applicationId, tier });

    if (!workspaceId) throw new Error("Workspace ID obrigatório");
    if (!tier || !TIER_PRICES[tier]) throw new Error("Tier inválido");

    // Get workspace Stripe config
    const { data: stripeConfig, error: configError } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .single();

    if (configError || !stripeConfig?.stripe_secret_key_encrypted) {
      throw new Error("Stripe não configurado neste workspace");
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
        metadata: { user_id: user.id, workspace_id: workspaceId },
      });
      customerId = customer.id;
    }

    const tierInfo = TIER_PRICES[tier];
    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: tierInfo.label,
            description: tierInfo.features,
            metadata: { tier, workspace_id: workspaceId },
          },
          unit_amount: tierInfo.amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${origin}/c2c/${workspaceId}/sponsor?status=success`,
      cancel_url: `${origin}/c2c/${workspaceId}/sponsor?status=cancelled`,
      metadata: {
        type: "sponsor",
        workspace_id: workspaceId,
        application_id: applicationId || "",
        tier,
        user_id: user.id,
      },
    });

    // Update application with payment reference if exists
    if (applicationId) {
      await supabaseClient
        .from("sponsor_applications")
        .update({
          stripe_payment_id: session.id,
          amount_paid: tierInfo.amount / 100,
        })
        .eq("id", applicationId)
        .eq("user_id", user.id);
    }

    logStep("Sponsor checkout created", { sessionId: session.id, tier });

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
