/**
 * create-checkout (Fase 1M)
 *
 * Suporta dois modos:
 *  A) Novo (recomendado): { workspaceId, billing_plan_id, interval: 'month'|'year', successUrl?, cancelUrl?, allowPromotionCodes? }
 *  B) Legacy: { workspaceId, plan: 'growth'|'scale'|'basic'|'pro'|'agency', successUrl?, cancelUrl? }
 *
 * No modo A, lê stripe_price_id_monthly/annual diretamente da tabela billing_plans.
 * No modo B, mantém o mapa hardcoded para retrocompatibilidade com chamadas antigas.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

// Legacy fallback (Fase pré-1L)
const LEGACY_PLAN_PRICE_MAP: Record<string, string> = {
  growth: "price_1T4UWYQpSN9dntDniCyqZLEG",
  scale: "price_1T4UXEQpSN9dntDn30lSolkc",
  basic: "price_1T4UWYQpSN9dntDniCyqZLEG",
  pro: "price_1T4UXEQpSN9dntDn30lSolkc",
  agency: "price_1T4UXEQpSN9dntDn30lSolkc",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    log("Function started");

    const body = await req.json();
    const {
      workspaceId,
      billing_plan_id,
      interval = "month",
      plan, // legacy
      subscriptionId,
      successUrl,
      cancelUrl,
      allowPromotionCodes = true,
      trialDays,
    } = body;

    if (!workspaceId) throw new Error("workspaceId é obrigatório");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !userData?.user?.email) throw new Error("Não autenticado");
    const user = userData.user;
    log("user authenticated", { userId: user.id });

    const admin = createClient(supabaseUrl, serviceKey);

    // Verificar pertença ao workspace
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Sem acesso a este workspace");

    // Resolver priceId + planCode + trial
    let priceId: string | null = null;
    let planCode: string | null = null;
    let resolvedBillingPlanId: string | null = null;
    let resolvedTrialDays: number = trialDays ?? 0;

    if (billing_plan_id) {
      // Modo A — Fase 1L/1M
      const { data: planRow, error: pErr } = await admin
        .from("billing_plans")
        .select("id, code, stripe_price_id_monthly, stripe_price_id_annual, monthly_price, annual_price, enterprise, is_active, trial_period_days")
        .eq("id", billing_plan_id)
        .maybeSingle();
      if (pErr || !planRow) throw new Error("Plano não encontrado");
      if (!planRow.is_active) throw new Error("Plano inativo");
      if (planRow.enterprise) throw new Error("Planos enterprise requerem contacto comercial");

      priceId = interval === "year" ? planRow.stripe_price_id_annual : planRow.stripe_price_id_monthly;
      if (!priceId) {
        throw new Error(`Plano ${planRow.code} ainda não está sincronizado com Stripe (${interval}). Peça ao admin para sincronizar.`);
      }
      planCode = planRow.code;
      resolvedBillingPlanId = planRow.id;
      if (!trialDays && planRow.trial_period_days) resolvedTrialDays = planRow.trial_period_days;
    } else if (plan) {
      // Modo B — legacy
      priceId = LEGACY_PLAN_PRICE_MAP[plan];
      if (!priceId) throw new Error(`Plano legacy inválido: ${plan}`);
      planCode = plan;
      // Tentar resolver billing_plan_id por code
      const { data: planRow } = await admin
        .from("billing_plans")
        .select("id")
        .eq("code", plan)
        .maybeSingle();
      if (planRow) resolvedBillingPlanId = planRow.id;
    } else {
      throw new Error("billing_plan_id ou plan (legacy) é obrigatório");
    }

    log("resolved price", { priceId, planCode, billing_plan_id: resolvedBillingPlanId, interval });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reutilizar customer se existir
    let customerId: string | undefined;
    const { data: existingSub } = await admin
      .from("workspace_subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: !!allowPromotionCodes,
      success_url: successUrl || `${origin}/dashboard/settings/plan?checkout=success`,
      cancel_url: cancelUrl || `${origin}/dashboard/plans?checkout=canceled`,
      metadata: {
        workspace_id: workspaceId,
        billing_plan_id: resolvedBillingPlanId ?? "",
        plan_code: planCode ?? "",
        interval,
        user_id: user.id,
        subscription_id: subscriptionId ?? "",
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          billing_plan_id: resolvedBillingPlanId ?? "",
          plan_code: planCode ?? "",
          interval,
        },
        ...(resolvedTrialDays > 0 ? { trial_period_days: resolvedTrialDays } : {}),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    log("session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
