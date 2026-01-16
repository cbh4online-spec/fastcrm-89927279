import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { moduleId, moduleName, workspaceId } = await req.json();
    logStep("Request data", { moduleId, moduleName, workspaceId });

    // Get module pricing from marketplace_modules
    const { data: module, error: moduleError } = await supabase
      .from("marketplace_modules")
      .select("id, name, slug, pricing")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      throw new Error("Module not found");
    }
    logStep("Module found", { moduleId: module.id, name: module.name });

    // Get or create Stripe price for this module
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Find existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Get module price from pricing JSON
    const pricing = module.pricing as { base_price?: number; type?: string } | null;
    const basePrice = pricing?.base_price || 9.99;
    const priceInCents = Math.round(basePrice * 100);

    // Search for existing price or create new one
    let priceId: string;
    
    // Try to find existing product
    const products = await stripe.products.search({
      query: `metadata['module_id']:'${moduleId}'`,
    });

    if (products.data.length > 0) {
      // Use existing product, get its price
      const existingProduct = products.data[0];
      const prices = await stripe.prices.list({ product: existingProduct.id, active: true });
      
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
        logStep("Using existing price", { priceId, productId: existingProduct.id });
      } else {
        // Create price for existing product
        const newPrice = await stripe.prices.create({
          product: existingProduct.id,
          unit_amount: priceInCents,
          currency: "eur",
          recurring: { interval: "month" },
        });
        priceId = newPrice.id;
        logStep("Created new price for existing product", { priceId });
      }
    } else {
      // Create new product and price
      const newProduct = await stripe.products.create({
        name: `FastCRM Module: ${module.name}`,
        description: `Módulo ${module.name} para FastCRM`,
        metadata: {
          module_id: moduleId,
          module_slug: module.slug,
        },
      });

      const newPrice = await stripe.prices.create({
        product: newProduct.id,
        unit_amount: priceInCents,
        currency: "eur",
        recurring: { interval: "month" },
      });
      priceId = newPrice.id;
      logStep("Created new product and price", { productId: newProduct.id, priceId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard/marketplace?success=true&module=${module.slug}`,
      cancel_url: `${origin}/dashboard/marketplace?canceled=true&module=${module.slug}`,
      metadata: {
        user_id: user.id,
        module_id: moduleId,
        module_slug: module.slug,
        workspace_id: workspaceId || "",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          module_id: moduleId,
          module_slug: module.slug,
          workspace_id: workspaceId || "",
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
