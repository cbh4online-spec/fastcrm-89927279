import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan names (new + legacy)
const PRODUCT_TO_PLAN: Record<string, string> = {
  // New plans
  "prod_U2Zfz8Cws9opiL": "growth",
  "prod_U2ZgsvWbkKLKaB": "scale",
  // Legacy mappings
  "prod_Tn6lMOO7zRREaL": "growth",   // old basic → growth
  "prod_Tn6mQSM7DNs1TO": "scale",    // old pro → scale
  "prod_Tn6mBblFLd6lD2": "scale",    // old agency → scale
};

// Plan limits
const PLAN_LIMITS: Record<string, {
  max_users: number;
  max_workspaces: number;
  dashboard_customization: boolean;
  sidebar_customization: boolean;
  user_layout_overrides: boolean;
  ai_suggestions: boolean;
  ai_insights: boolean;
  automation_custom_fields: boolean;
  max_automations: number;
  multi_conditions: boolean;
  multi_actions: boolean;
  monthly_ai_calls: number;
  templates: boolean;
  white_label: boolean;
  multi_pipeline: boolean;
  marketplace_access: boolean;
  api_access: boolean;
  advanced_roles: boolean;
  priority_support: boolean;
}> = {
  starter: {
    max_users: 3,
    max_workspaces: 1,
    dashboard_customization: false,
    sidebar_customization: false,
    user_layout_overrides: false,
    ai_suggestions: false,
    ai_insights: false,
    automation_custom_fields: false,
    max_automations: 5,
    multi_conditions: false,
    multi_actions: false,
    monthly_ai_calls: 0,
    templates: false,
    white_label: false,
    multi_pipeline: false,
    marketplace_access: false,
    api_access: false,
    advanced_roles: false,
    priority_support: false,
  },
  growth: {
    max_users: 10,
    max_workspaces: 1,
    dashboard_customization: true,
    sidebar_customization: true,
    user_layout_overrides: true,
    ai_suggestions: true,
    ai_insights: true,
    automation_custom_fields: true,
    max_automations: 50,
    multi_conditions: true,
    multi_actions: false,
    monthly_ai_calls: 500,
    templates: false,
    white_label: false,
    multi_pipeline: true,
    marketplace_access: true,
    api_access: false,
    advanced_roles: false,
    priority_support: false,
  },
  scale: {
    max_users: -1,
    max_workspaces: -1,
    dashboard_customization: true,
    sidebar_customization: true,
    user_layout_overrides: true,
    ai_suggestions: true,
    ai_insights: true,
    automation_custom_fields: true,
    max_automations: -1,
    multi_conditions: true,
    multi_actions: true,
    monthly_ai_calls: 5000,
    templates: true,
    white_label: true,
    multi_pipeline: true,
    marketplace_access: true,
    api_access: true,
    advanced_roles: true,
    priority_support: true,
  },
};

// Legacy plan name mapping
function normalizePlanName(plan: string): string {
  const legacyMap: Record<string, string> = {
    free: "starter",
    basic: "growth",
    pro: "scale",
    agency: "scale",
  };
  return legacyMap[plan] || plan;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const workspaceId = body.workspace_id || body.workspaceId;
    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }
    logStep("Workspace ID resolved", { workspaceId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check existing subscription in database
    const { data: subscription } = await supabaseClient
      .from("workspace_subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    if (subscription?.stripe_subscription_id) {
      // Already linked — verify with Stripe
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        const isActive = ["active", "trialing"].includes(stripeSubscription.status);
        const productId = stripeSubscription.items.data[0]?.price.product as string;
        const plan = PRODUCT_TO_PLAN[productId] || "starter";

        // Update database if status changed
        if (subscription.status !== stripeSubscription.status || normalizePlanName(subscription.plan) !== plan) {
          await supabaseClient
            .from("workspace_subscriptions")
            .update({
              status: stripeSubscription.status,
              plan: plan,
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            })
            .eq("id", subscription.id);
        }

        logStep("Subscription verified with Stripe", { plan, status: stripeSubscription.status });

        return new Response(JSON.stringify({
          subscribed: isActive,
          plan: plan,
          limits: PLAN_LIMITS[plan],
          subscription_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (stripeError) {
        logStep("Stripe error, falling back to database", { error: String(stripeError) });
      }
    } else {
      // No stripe IDs — try to find customer by workspace owner email
      logStep("No Stripe IDs found, attempting lookup by owner email");

      try {
        // Get workspace owner email
        const { data: ownerMember } = await supabaseClient
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", workspaceId)
          .eq("role", "owner")
          .maybeSingle();

        if (ownerMember?.user_id) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("email")
            .eq("id", ownerMember.user_id)
            .maybeSingle();

          const ownerEmail = profile?.email;
          if (ownerEmail) {
            logStep("Owner email found", { email: ownerEmail });

            const customers = await stripe.customers.list({ email: ownerEmail, limit: 1 });
            if (customers.data.length > 0) {
              const customerId = customers.data[0].id;
              logStep("Stripe customer found", { customerId });

              const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: "active",
                limit: 1,
              });

              if (subscriptions.data.length > 0) {
                const stripeSub = subscriptions.data[0];
                const productId = stripeSub.items.data[0]?.price.product as string;
                const plan = PRODUCT_TO_PLAN[productId] || "starter";

                // Save IDs to database
                const updateData = {
                  stripe_customer_id: customerId,
                  stripe_subscription_id: stripeSub.id,
                  status: stripeSub.status,
                  plan: plan,
                  current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: stripeSub.cancel_at_period_end,
                };

                if (subscription) {
                  await supabaseClient
                    .from("workspace_subscriptions")
                    .update(updateData)
                    .eq("id", subscription.id);
                } else {
                  await supabaseClient
                    .from("workspace_subscriptions")
                    .insert({ ...updateData, workspace_id: workspaceId });
                }

                logStep("Stripe IDs linked to workspace", { customerId, subscriptionId: stripeSub.id, plan });

                return new Response(JSON.stringify({
                  subscribed: true,
                  plan: plan,
                  limits: PLAN_LIMITS[plan],
                  subscription_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: stripeSub.cancel_at_period_end,
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                });
              } else {
                logStep("Stripe customer found but no active subscription");
                // Still save customer ID for future use
                if (subscription) {
                  await supabaseClient
                    .from("workspace_subscriptions")
                    .update({ stripe_customer_id: customerId })
                    .eq("id", subscription.id);
                }
              }
            } else {
              logStep("No Stripe customer found for owner email");
            }
          } else {
            logStep("Owner profile has no email");
          }
        } else {
          logStep("No owner found for workspace");
        }
      } catch (lookupError) {
        logStep("Stripe lookup error, falling back to database", { error: String(lookupError) });
      }
    }

    // Return database subscription or starter plan
    const rawPlan = subscription?.plan || "starter";
    const plan = normalizePlanName(rawPlan);
    const isActive = subscription?.status === "active";

    logStep("Returning subscription status", { plan, isActive });

    return new Response(JSON.stringify({
      subscribed: isActive && plan !== "starter",
      plan: plan,
      limits: PLAN_LIMITS[plan] || PLAN_LIMITS.starter,
      subscription_end: subscription?.current_period_end || null,
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      subscribed: false,
      plan: "starter",
      limits: PLAN_LIMITS.starter,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
