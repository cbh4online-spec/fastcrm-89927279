import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-PURCHASE-CREDITS] ${step}${detailsStr}`);
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

    const { workspaceId, packageId, moduleId } = await req.json();

    if (!workspaceId || !packageId) {
      throw new Error("Missing required parameters: workspaceId, packageId");
    }

    // Get the credit package
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !creditPackage) {
      throw new Error("Credit package not found or inactive");
    }

    logStep("Package found", { packageId, credits: creditPackage.credits_amount, price: creditPackage.price });

    // Check if package is applicable for the module (if specified)
    if (moduleId && creditPackage.module_ids && creditPackage.module_ids.length > 0) {
      if (!creditPackage.module_ids.includes(moduleId)) {
        throw new Error("This package is not available for the specified module");
      }
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          workspace_id: workspaceId
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "payment",
      line_items: creditPackage.stripe_price_id 
        ? [{ price: creditPackage.stripe_price_id, quantity: 1 }]
        : [{
            price_data: {
              currency: creditPackage.currency.toLowerCase(),
              product_data: {
                name: `${creditPackage.credits_amount} Créditos - ${creditPackage.name}`,
                description: creditPackage.description || `Pacote de ${creditPackage.credits_amount} créditos`
              },
              unit_amount: Math.round(creditPackage.price * 100),
            },
            quantity: 1
          }],
      success_url: `${origin}/dashboard/marketplace?purchase=success&credits=${creditPackage.credits_amount}`,
      cancel_url: `${origin}/dashboard/marketplace?purchase=cancelled`,
      metadata: {
        type: 'credit_purchase',
        workspace_id: workspaceId,
        package_id: packageId,
        module_id: moduleId || '',
        credits_amount: creditPackage.credits_amount.toString(),
        user_id: user.id
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
