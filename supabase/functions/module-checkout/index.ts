import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[MODULE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { moduleId, workspaceId } = await req.json();
    if (!moduleId || !workspaceId) throw new Error("moduleId and workspaceId are required");

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Not a workspace member");

    // Get module
    const { data: mod, error: modErr } = await supabase
      .from("marketplace_modules")
      .select("id, name, slug, pricing_model, price_eur, stripe_price_id")
      .eq("id", moduleId)
      .maybeSingle();

    if (modErr || !mod) throw new Error("Module not found");
    logStep("Module found", { slug: mod.slug, pricing_model: mod.pricing_model });

    // FREE / INCLUDED / TEMPLATE → install directly via provisioner
    if (mod.pricing_model === "free" || mod.pricing_model === "included" || mod.pricing_model === "template") {
      // Upsert workspace_modules
      const now = new Date().toISOString();
      await supabase.from("workspace_modules").upsert({
        workspace_id: workspaceId,
        module_id: mod.id,
        status: "active",
        pricing_model: mod.pricing_model,
        price_eur: 0,
        subscribed_by: user.id,
        subscribed_at: now,
        current_period_start: now,
      }, { onConflict: "workspace_id,module_id" });

      logStep("Module installed directly", { slug: mod.slug });

      return new Response(JSON.stringify({
        success: true,
        action: "installed",
        message: `Módulo ${mod.name} instalado com sucesso!`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MONTHLY → Create Stripe Checkout Session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    // Use stripe_price_id if available, otherwise create price_data
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = mod.stripe_price_id
      ? [{ price: mod.stripe_price_id, quantity: 1 }]
      : [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `FastCRM Module: ${mod.name}`,
              description: `Subscrição mensal do módulo ${mod.name}`,
            },
            unit_amount: Math.round(mod.price_eur * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        }];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/dashboard/marketplace?success=true&module=${mod.slug}`,
      cancel_url: `${origin}/dashboard/marketplace?canceled=true&module=${mod.slug}`,
      metadata: {
        type: "module_subscription",
        user_id: user.id,
        module_id: moduleId,
        module_slug: mod.slug,
        workspace_id: workspaceId,
      },
      subscription_data: {
        metadata: {
          type: "module_subscription",
          user_id: user.id,
          module_id: moduleId,
          module_slug: mod.slug,
          workspace_id: workspaceId,
        },
      },
    });

    // Create pending installation
    await supabase.from("workspace_modules").upsert({
      workspace_id: workspaceId,
      module_id: mod.id,
      status: "pending",
      pricing_model: "monthly",
      price_eur: mod.price_eur,
      subscribed_by: user.id,
    }, { onConflict: "workspace_id,module_id" });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
