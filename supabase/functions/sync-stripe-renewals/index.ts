// Reconciliação on-demand: lê o estado real das subscrições no Stripe e atualiza os contratos de renovação.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  workspace_id: z.string().uuid(),
  contract_id: z.string().uuid().optional(),
  stripe_subscription_id: z.string().regex(/^sub_[A-Za-z0-9]+$/).max(100).optional(),
});

const toDate = (s?: number | null) => (s ? new Date(s * 1000).toISOString().split("T")[0] : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.slice(7);
    const isService = token === serviceKey;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { workspace_id, contract_id, stripe_subscription_id } = parsed.data;

    if (!isService) {
      const { data: u, error } = await db.auth.getUser(token);
      if (error || !u?.user) return json({ error: "Não autorizado" }, 401);
      const { data: m } = await db.from("workspace_members").select("id")
        .eq("workspace_id", workspace_id).eq("user_id", u.user.id).maybeSingle();
      const { data: sa } = await db.rpc("is_super_admin", { _user_id: u.user.id });
      if (!m && !sa) return json({ error: "Sem acesso a este workspace" }, 403);
    }

    const { data: cfg } = await db.from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted").eq("workspace_id", workspace_id).eq("is_active", true).maybeSingle();
    const stripeKey = cfg?.stripe_secret_key_encrypted || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ success: false, error: "Stripe não configurado neste workspace" });
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Ligação manual de uma subscrição existente
    if (contract_id && stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(stripe_subscription_id).catch(() => null);
      if (!sub) return json({ success: false, error: "Subscrição não encontrada no Stripe" });
      const { error } = await db.from("renewal_contracts")
        .update({ stripe_subscription_id, stripe_customer_id: String(sub.customer), billing_type: "stripe" })
        .eq("id", contract_id).eq("workspace_id", workspace_id);
      if (error) return json({ success: false, error: error.message });
    }

    let q = db.from("renewal_contracts")
      .select("id, status, next_renewal_date, stripe_subscription_id")
      .eq("workspace_id", workspace_id).not("stripe_subscription_id", "is", null);
    if (contract_id) q = q.eq("id", contract_id);
    const { data: contracts, error: cErr } = await q;
    if (cErr) return json({ success: false, error: cErr.message });

    const results: any[] = [];
    for (const c of contracts || []) {
      try {
        const sub: any = await stripe.subscriptions.retrieve(c.stripe_subscription_id!);
        const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
        const update: Record<string, unknown> = { billing_type: "stripe", stripe_customer_id: String(sub.customer) };
        const next = toDate(periodEnd);
        if (next) update.next_renewal_date = next;
        if (sub.status === "active" || sub.status === "trialing") update.status = "active";
        else if (sub.status === "paused") update.status = "paused";
        else if (sub.status === "canceled" || sub.status === "incomplete_expired") update.status = "churned";
        else if (sub.status === "past_due" || sub.status === "unpaid") update.risk_level = "high";
        await db.from("renewal_contracts").update(update).eq("id", c.id);

        // Reconciliar pagamentos em falta (sem duplicar: chave stripe_invoice_id)
        const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 24 });
        let added = 0;
        for (const inv of invoices.data) {
          if (inv.status !== "paid") continue;
          const { data: exists } = await db.from("renewal_payment_events").select("id")
            .eq("contract_id", c.id).eq("stripe_invoice_id", inv.id).limit(1).maybeSingle();
          if (exists) continue;
          await db.from("renewal_payment_events").insert({
            workspace_id, contract_id: c.id,
            stripe_event_id: `sync-${inv.id}`,
            event_type: "payment_succeeded",
            amount: (inv.amount_paid || 0) / 100,
            currency: inv.currency?.toUpperCase() || "EUR",
            stripe_invoice_id: inv.id,
            stripe_subscription_id: sub.id,
            metadata: { source: "reconciliation", invoice_number: inv.number },
          });
          added++;
        }
        results.push({ contract_id: c.id, ok: true, stripe_status: sub.status, next_renewal_date: next, payments_added: added });
      } catch (e: any) {
        console.error("[SYNC-STRIPE-RENEWALS]", c.id, e?.message);
        results.push({ contract_id: c.id, ok: false, error: e?.message || "Erro" });
      }
    }

    return json({ success: true, synced: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
  } catch (e: any) {
    console.error("[SYNC-STRIPE-RENEWALS] fatal", e?.message);
    return json({ success: false, error: "internal_error" });
  }
});
