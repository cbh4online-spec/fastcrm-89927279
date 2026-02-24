import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// SaaS plan -> Stripe price mapping (new + legacy aliases)
const PLAN_PRICE_MAP: Record<string, string> = {
  growth: "price_1T4UWYQpSN9dntDniCyqZLEG",
  scale: "price_1T4UXEQpSN9dntDn30lSolkc",
  // Legacy aliases
  basic: "price_1T4UWYQpSN9dntDniCyqZLEG",
  pro: "price_1T4UXEQpSN9dntDn30lSolkc",
  agency: "price_1T4UXEQpSN9dntDn30lSolkc",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    logStep("Function started");

    const { plan, workspaceId, subscriptionId, successUrl, cancelUrl } = await req.json();
    logStep("Request body", { plan, workspaceId, subscriptionId });

    if (!plan) {
      throw new Error("Plan is required");
    }

    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) {
      throw new Error(`Invalid plan: ${plan}. Valid plans: ${Object.keys(PLAN_PRICE_MAP).join(", ")}`);
    }
    logStep("Resolved price", { plan, priceId });

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

    // Use global STRIPE_SECRET_KEY (SaaS platform key)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

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
        plan: plan,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          subscription_id: subscriptionId || null,
          plan: plan,
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
