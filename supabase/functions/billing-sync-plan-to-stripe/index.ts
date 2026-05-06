/**
 * Fase 1M — Sincronização billing_plans -> Stripe
 *
 * Cria/atualiza Product e Prices (mensal + anual) no Stripe para um billing_plan
 * e guarda os IDs resultantes na tabela billing_plans.
 *
 * Input: { plan_id: uuid, mode?: 'test'|'live' }
 * Apenas super admins podem executar.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[BILLING-SYNC-PLAN] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Validar utilizador autenticado e super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !userData?.user) throw new Error("Não autenticado");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: userData.user.id });
    if (!isAdmin) throw new Error("Apenas super admins podem sincronizar planos");

    const body = await req.json();
    const { plan_id } = body;
    if (!plan_id) throw new Error("plan_id obrigatório");

    log("start", { plan_id, by: userData.user.id });

    const { data: plan, error: pErr } = await admin
      .from("billing_plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();
    if (pErr || !plan) throw new Error("Plano não encontrado");

    if (plan.enterprise) {
      // Enterprise = sob consulta, não cria no Stripe
      await admin.from("billing_plans").update({
        stripe_synced_at: new Date().toISOString(),
        stripe_sync_error: null,
      }).eq("id", plan_id);
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: "enterprise plans are not created in Stripe",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const currency = (plan.currency || "eur").toLowerCase();

    // 1. Product (criar ou atualizar)
    let productId = plan.stripe_product_id;
    if (productId) {
      try {
        await stripe.products.update(productId, {
          name: plan.name,
          description: plan.public_description ?? plan.description ?? undefined,
          active: !!plan.is_active,
          metadata: { billing_plan_id: plan.id, plan_code: plan.code },
        });
        log("product updated", { productId });
      } catch (e) {
        log("product update failed, recreating", { error: (e as Error).message });
        productId = null;
      }
    }
    if (!productId) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.public_description ?? plan.description ?? undefined,
        active: !!plan.is_active,
        metadata: { billing_plan_id: plan.id, plan_code: plan.code },
      });
      productId = product.id;
      log("product created", { productId });
    }

    // 2. Prices: mensal e anual. Se preço alterou, criamos novo (Stripe prices são imutáveis)
    //    e arquivamos o antigo.
    const priceIds: { monthly: string | null; annual: string | null } = {
      monthly: plan.stripe_price_id_monthly ?? null,
      annual: plan.stripe_price_id_annual ?? null,
    };

    const ensurePrice = async (
      currentId: string | null,
      amount: number | null,
      interval: "month" | "year",
    ): Promise<string | null> => {
      if (amount === null || amount === undefined) return null;
      const unitAmount = Math.round(Number(amount) * 100);
      if (unitAmount < 0) return null;

      if (currentId) {
        try {
          const existing = await stripe.prices.retrieve(currentId);
          const existingInterval = existing.recurring?.interval;
          if (
            existing.active &&
            existing.unit_amount === unitAmount &&
            existing.currency === currency &&
            existingInterval === interval &&
            existing.product === productId
          ) {
            return currentId; // sem mudanças
          }
          // Arquivar antigo
          await stripe.prices.update(currentId, { active: false });
          log("price archived", { currentId, interval });
        } catch (e) {
          log("price retrieve failed, recreating", { interval, error: (e as Error).message });
        }
      }

      const created = await stripe.prices.create({
        product: productId!,
        currency,
        unit_amount: unitAmount,
        recurring: { interval },
        metadata: { billing_plan_id: plan.id, plan_code: plan.code, interval_label: interval },
      });
      log("price created", { interval, priceId: created.id, unitAmount });
      return created.id;
    };

    const newMonthly = await ensurePrice(priceIds.monthly, plan.monthly_price, "month");
    const newAnnual = await ensurePrice(priceIds.annual, plan.annual_price, "year");

    // 3. Persistir
    const { error: updErr } = await admin.from("billing_plans").update({
      stripe_product_id: productId,
      stripe_price_id_monthly: newMonthly,
      stripe_price_id_annual: newAnnual,
      stripe_synced_at: new Date().toISOString(),
      stripe_sync_error: null,
    }).eq("id", plan_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      ok: true,
      stripe_product_id: productId,
      stripe_price_id_monthly: newMonthly,
      stripe_price_id_annual: newAnnual,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    // Tentar guardar erro no plano se temos plan_id
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const admin = createClient(supabaseUrl, serviceKey);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.plan_id) {
        await admin.from("billing_plans").update({ stripe_sync_error: msg }).eq("id", body.plan_id);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, // 200 + ok:false para não quebrar UI
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
