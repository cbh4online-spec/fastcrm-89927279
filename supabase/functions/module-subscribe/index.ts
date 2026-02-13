import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-SUBSCRIBE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    // Support both camelCase and snake_case for compatibility
    const workspaceId = body.workspaceId || body.workspace_id;
    const moduleId = body.moduleId || body.module_id;
    const billingCycle = body.billingCycle || body.billing_cycle || 'monthly';

    if (!workspaceId || !moduleId) {
      throw new Error("Missing required parameters: workspaceId, moduleId");
    }

    logStep("Request params", { workspaceId, moduleId, billingCycle });

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from('workspace_module_subscriptions')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .single();

    if (existingSub && existingSub.status === 'active') {
      throw new Error("Already subscribed to this module");
    }

    // Get module pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('module_pricing')
      .select('*')
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .single();

    if (pricingError || !pricing) {
      throw new Error("Module pricing not found");
    }

    logStep("Pricing found", { moduleId, model: pricing.pricing_model, price: pricing.base_price_monthly });

    // If free module, activate directly
    if (pricing.base_price_monthly === 0 && pricing.pricing_model === 'fixed') {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Create or update subscription in workspace_module_subscriptions
      const { error: subError } = await supabase
        .from('workspace_module_subscriptions')
        .upsert({
          workspace_id: workspaceId,
          module_id: moduleId,
          status: 'active',
          billing_cycle: billingCycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          activated_at: now.toISOString()
        }, {
          onConflict: 'workspace_id,module_id'
        });

      if (subError) throw subError;

      // Also insert into workspace_modules for the new hook to find
      const { error: moduleError } = await supabase
        .from('workspace_modules')
        .upsert({
          workspace_id: workspaceId,
          module_id: moduleId,
          status: 'active',
          subscribed_at: now.toISOString(),
          subscribed_by: user.id,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        }, {
          onConflict: 'workspace_id,module_id'
        });

      if (moduleError) {
        logStep("Warning: Could not insert into workspace_modules", { error: moduleError.message });
      }

      // Initialize credit balance
      if (pricing.credits_included > 0) {
        await supabase
          .from('workspace_credit_balances')
          .upsert({
            workspace_id: workspaceId,
            module_id: moduleId,
            credits_total: pricing.credits_included,
            credits_used: 0,
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString()
          }, {
            onConflict: 'workspace_id,module_id,period_start'
          });
      }

      logStep("Free module activated", { moduleId, workspaceId });

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Módulo ativado com sucesso!',
        subscription: {
          status: 'active',
          creditsIncluded: pricing.credits_included
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For paid modules, create Stripe checkout
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          workspace_id: workspaceId
        }
      });
      customerId = customer.id;
    }

    const price = billingCycle === 'yearly' ? pricing.base_price_yearly : pricing.base_price_monthly;
    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: pricing.currency.toLowerCase(),
          product_data: {
            name: `Módulo: ${moduleId}`,
            description: `Subscrição ${billingCycle === 'yearly' ? 'anual' : 'mensal'} com ${pricing.credits_included} créditos incluídos`
          },
          unit_amount: Math.round(price * 100),
          recurring: {
            interval: billingCycle === 'yearly' ? 'year' : 'month'
          }
        },
        quantity: 1
      }],
      success_url: `${origin}/dashboard/marketplace?module=${moduleId}&subscription=success`,
      cancel_url: `${origin}/dashboard/marketplace?module=${moduleId}&subscription=cancelled`,
      subscription_data: {
        metadata: {
          type: 'module_subscription',
          workspace_id: workspaceId,
          module_id: moduleId,
          credits_included: pricing.credits_included.toString(),
          user_id: user.id
        }
      },
      metadata: {
        type: 'module_subscription',
        workspace_id: workspaceId,
        module_id: moduleId
      }
    };

    // Add trial if configured
    if (pricing.trial_days > 0) {
      sessionParams.subscription_data!.trial_period_days = pricing.trial_days;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
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
