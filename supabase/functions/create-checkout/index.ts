import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

interface WorkspaceStripeConfig {
  stripe_secret_key_encrypted: string | null;
  stripe_publishable_key: string | null;
  is_active: boolean;
  test_mode: boolean;
}

// Helper to get workspace Stripe config
async function getWorkspaceStripeConfig(
  supabaseUrl: string, 
  supabaseKey: string, 
  workspaceId: string
): Promise<WorkspaceStripeConfig> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from("workspace_stripe_config")
    .select("stripe_secret_key_encrypted, stripe_publishable_key, is_active, test_mode")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error("Stripe não configurado para este workspace");
  }

  const config = data as WorkspaceStripeConfig;
  
  if (!config.stripe_secret_key_encrypted) {
    throw new Error("Chave secreta Stripe não configurada");
  }

  return config;
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

    const { priceId, workspaceId, subscriptionId, successUrl, cancelUrl } = await req.json();
    logStep("Request body", { priceId, workspaceId, subscriptionId });

    if (!priceId) {
      throw new Error("Price ID is required");
    }

    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get workspace Stripe config
    const stripeConfig = await getWorkspaceStripeConfig(supabaseUrl, supabaseKey, workspaceId);
    logStep("Stripe config loaded", { testMode: stripeConfig.test_mode });

    const stripe = new Stripe(stripeConfig.stripe_secret_key_encrypted!, { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${origin}/dashboard/billing?checkout=success`,
      cancel_url: cancelUrl || `${origin}/dashboard/billing?checkout=canceled`,
      metadata: {
        workspace_id: workspaceId,
        subscription_id: subscriptionId || null,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          subscription_id: subscriptionId || null,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
