import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type PlanSlug = "starter" | "growth";
type Interval = "month" | "year";

interface Body {
  plan: PlanSlug;
  interval: Interval;
  withWhatsapp?: boolean;
  successUrl?: string;
  cancelUrl?: string;
}

// Pricing (EUR, sem IVA) — espelha src/config/leadchef/pricing.ts
const PLAN_PRICES: Record<PlanSlug, { name: string; monthly: number }> = {
  starter: { name: "LeadChef Starter", monthly: 4.99 },
  growth: { name: "LeadChef Growth", monthly: 6.99 },
};
const WHATSAPP = { name: "LeadChef · Add-on WhatsApp", monthly: 29.99 };
const ANNUAL_PAID_MONTHS = 10; // 2 meses grátis

const log = (step: string, details?: unknown) =>
  console.log(`[LEADCHEF-CHECKOUT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem header de autorização");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(userErr.message);
    const user = userData.user;
    if (!user?.email) throw new Error("Utilizador não autenticado");

    const body = (await req.json()) as Body;
    if (!body?.plan || !["starter", "growth"].includes(body.plan)) throw new Error("Plano inválido");
    if (!body?.interval || !["month", "year"].includes(body.interval)) throw new Error("Intervalo inválido");

    const planCfg = PLAN_PRICES[body.plan];
    const isYear = body.interval === "year";
    const planUnit = Math.round(
      (isYear ? planCfg.monthly * ANNUAL_PAID_MONTHS : planCfg.monthly) * 100,
    );

    log("Building checkout", { user: user.email, plan: body.plan, interval: body.interval, withWhatsapp: !!body.withWhatsapp });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reutiliza customer existente se houver
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: planUnit,
          recurring: { interval: body.interval },
          product_data: {
            name: `${planCfg.name} (${isYear ? "Anual" : "Mensal"})`,
            metadata: { leadchef_plan: body.plan, leadchef_interval: body.interval },
          },
        },
      },
    ];

    if (body.withWhatsapp) {
      const waUnit = Math.round(
        (isYear ? WHATSAPP.monthly * ANNUAL_PAID_MONTHS : WHATSAPP.monthly) * 100,
      );
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: waUnit,
          recurring: { interval: body.interval },
          product_data: {
            name: `${WHATSAPP.name} (${isYear ? "Anual" : "Mensal"})`,
            metadata: { leadchef_addon: "whatsapp", leadchef_interval: body.interval },
          },
        },
      });
    }

    const origin = req.headers.get("origin") || "https://fastcrm.metodopare.ai";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: body.successUrl || `${origin}/dashboard/leadchef/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl || `${origin}/dashboard/leadchef/billing?status=cancel`,
      subscription_data: {
        metadata: {
          leadchef_plan: body.plan,
          leadchef_interval: body.interval,
          leadchef_whatsapp: body.withWhatsapp ? "1" : "0",
          user_id: user.id,
        },
      },
      metadata: {
        leadchef_plan: body.plan,
        leadchef_interval: body.interval,
        user_id: user.id,
      },
    });

    log("Session created", { id: session.id });
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg, fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
