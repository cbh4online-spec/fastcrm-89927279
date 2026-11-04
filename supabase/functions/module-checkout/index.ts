import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { activeModulePlan, meetsModuleMinimumPlan } from "../_shared/module-plan.ts";
import { planModuleCheckout } from "../_shared/moduleBilling.ts";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const parsed = z.object({
      moduleId: z.string().uuid(),
      workspaceId: z.string().uuid(),
      billing: z.enum(["monthly", "one_time"]).default("monthly"),
    }).safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Pedido inválido", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { moduleId, workspaceId, billing } = parsed.data;

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
      .select("id, name, slug, pricing_model, price_eur, one_time_price_eur, min_plan, stripe_price_id, stripe_one_time_price_id")
      .eq("id", moduleId)
      .in("status", ["active", "published"])
      .maybeSingle();

    if (modErr || !mod) throw new Error("Module not found");
    logStep("Module found", { slug: mod.slug, pricing_model: mod.pricing_model });

    // Enforce the same eligibility on direct checkout calls as extension-check.
    // A Starter customer must never reach payment for a module requiring Growth.
    const { data: subscription, error: subscriptionError } = await supabase
      .from("workspace_subscriptions")
      .select("plan, status, current_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    const currentPlan = activeModulePlan(subscription);
    if (!meetsModuleMinimumPlan(currentPlan, mod.min_plan)) {
      return new Response(JSON.stringify({
        error: `O módulo requer o plano ${mod.min_plan} ou superior`,
        code: "upgrade_required",
        currentPlan,
        requiredPlan: mod.min_plan,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Já ativo → não deixa comprar duas vezes
    const { data: existing } = await supabase
      .from("workspace_modules")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("module_id", mod.id)
      .maybeSingle();
    if (existing?.status === "active") {
      return new Response(JSON.stringify({ error: "Este módulo já está ativo neste workspace", code: "already_active" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = planModuleCheckout(mod, billing);
    if (!plan.ok) {
      return new Response(JSON.stringify({ error: "O preço desta opção ainda não está configurado", code: plan.code }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";
    const isOneTime = plan.mode === "payment";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = plan.priceId
      ? [{ price: plan.priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `FastCRM Module: ${mod.name}`,
              description: isOneTime ? `Licença única do módulo ${mod.name}` : `Subscrição mensal do módulo ${mod.name}`,
            },
            unit_amount: plan.unitAmountCents,
            ...(isOneTime ? {} : { recurring: { interval: "month" as const } }),
          },
          quantity: 1,
        }];

    const metadata = {
      type: isOneTime ? "module_one_time" : "module_subscription",
      user_id: user.id,
      module_id: moduleId,
      module_slug: mod.slug,
      workspace_id: workspaceId,
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: plan.mode,
      success_url: `${origin}/dashboard/marketplace?success=true&module=${encodeURIComponent(mod.slug)}`,
      cancel_url: `${origin}/dashboard/marketplace?canceled=true&module=${encodeURIComponent(mod.slug)}`,
      metadata,
      ...(isOneTime ? {} : { subscription_data: { metadata } }),
    });

    await supabase.from("workspace_modules").upsert({
      workspace_id: workspaceId,
      module_id: mod.id,
      status: "pending",
      pricing_model: isOneTime ? "one_time" : "monthly",
      billing_type: plan.billingType,
      price_eur: plan.unitAmountCents / 100,
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
      status: /unauthori[sz]ed|not authenticated|no authorization/i.test(msg) ? 401 : /not a workspace member/i.test(msg) ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
