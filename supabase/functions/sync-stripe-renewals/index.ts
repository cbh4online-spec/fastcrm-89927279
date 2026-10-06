// Reconciliação on-demand: lê o estado real das subscrições no Stripe e atualiza os contratos de renovação.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.23.8";
import { resolveStripeCustomer } from "../_shared/stripeCustomerResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  workspace_id: z.string().uuid(),
  contract_id: z.string().uuid().optional(),
  contract_ids: z.array(z.string().uuid()).max(500).optional(),
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
    let actorId: string | null = null;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { workspace_id, contract_id, contract_ids, stripe_subscription_id } = parsed.data;

    if (!isService) {
      const { data: u, error } = await db.auth.getUser(token);
      if (error || !u?.user) return json({ error: "Não autorizado" }, 401);
      actorId = u.user.id;
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

    // Auto-descoberta: contratos sem subscrição → procurar no Stripe por email dos contactos / nome
    const linked: string[] = [];
    {
      let uq = db.from("renewal_contracts")
        .select("id, company_id, contact_id, company:companies(name)")
        .eq("workspace_id", workspace_id).is("stripe_subscription_id", null);
      if (contract_id) uq = uq.eq("id", contract_id);
      else if (contract_ids?.length) uq = uq.in("id", contract_ids);
      const { data: unlinked } = await uq.limit(200);
      const { data: used } = await db.from("renewal_contracts").select("stripe_subscription_id")
        .eq("workspace_id", workspace_id).not("stripe_subscription_id", "is", null);
      const usedSubs = new Set((used || []).map((r: any) => r.stripe_subscription_id));
      for (const c of (unlinked || []) as any[]) {
        try {
          const emails = new Set<string>();
          const ids = [c.contact_id].filter(Boolean);
          if (ids.length) {
            const { data } = await db.from("contacts").select("email").in("id", ids);
            (data || []).forEach((r: any) => r.email && emails.add(r.email.trim().toLowerCase()));
          }
          if (c.company_id) {
            const { data } = await db.from("contacts").select("email")
              .eq("workspace_id", workspace_id).eq("company_id", c.company_id).is("deleted_at", null).limit(10);
            (data || []).forEach((r: any) => r.email && emails.add(r.email.trim().toLowerCase()));
          }
          const candidates: any[] = [];
          for (const e of emails) {
            const cs = await stripe.customers.list({ email: e, limit: 5 });
            candidates.push(...cs.data);
          }
          const name = c.company?.name?.trim();
          if (!candidates.length && name && name.length >= 5) {
            const cs = await stripe.customers.search({ query: `name:'${name.replace(/'/g, "")}'`, limit: 5 });
            const exact = cs.data.filter((x) => (x.name || "").trim().toLowerCase() === name.toLowerCase());
            candidates.push(...exact);
          }
          const subs: any[] = [];
          for (const cu of candidates) {
            const s = await stripe.subscriptions.list({ customer: cu.id, status: "all", limit: 10 });
            subs.push(...s.data.filter((x) => ["active", "trialing", "past_due", "paused"].includes(x.status) && !usedSubs.has(x.id)));
          }
          // Só liga quando há correspondência inequívoca
          if (subs.length === 1) {
            const s = subs[0];
            await db.from("renewal_contracts")
              .update({ stripe_subscription_id: s.id, stripe_customer_id: String(s.customer), billing_type: "stripe" })
              .eq("id", c.id).eq("workspace_id", workspace_id);
            usedSubs.add(s.id);
            linked.push(c.id);
          }
        } catch (e: any) {
          console.error("[SYNC-STRIPE-RENEWALS] auto-link", c.id, e?.message);
        }
      }
    }

    let q = db.from("renewal_contracts")
      .select("id, status, next_renewal_date, stripe_subscription_id, contact_id, company_id")
      .eq("workspace_id", workspace_id).not("stripe_subscription_id", "is", null);
    if (contract_id) q = q.eq("id", contract_id);
    else if (contract_ids?.length) q = q.in("id", contract_ids);
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

        // Ligar às fichas do CRM sem duplicar e etiquetar com "stripe"
        try {
          const cu: any = await stripe.customers.retrieve(String(sub.customer));
          if (cu && !cu.deleted) {
            await resolveStripeCustomer(db, {
              workspaceId: workspace_id,
              contract: c as any,
              createdBy: actorId,
              customer: { name: cu.name, email: cu.email, phone: cu.phone, tax_id: cu.tax_ids?.data?.[0]?.value },
            });
          }
        } catch (e: any) {
          console.error("[SYNC-STRIPE-RENEWALS] resolve", c.id, e?.message);
        }

        // Reconciliar pagamentos e faturas (sem duplicar: chave stripe_invoice_id / external_id)
        const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 100 });
        let added = 0;
        let invoicesAdded = 0;
        for (const inv of invoices.data as any[]) {
          if (inv.status !== "paid") continue;
          const paidTs = inv.status_transitions?.paid_at || inv.created;
          const paidAt = new Date(paidTs * 1000).toISOString();
          const amount = (inv.amount_paid || 0) / 100;
          const currency = inv.currency?.toUpperCase() || "EUR";

          const evMeta = { source: "reconciliation", invoice_number: inv.number, hosted_invoice_url: inv.hosted_invoice_url, invoice_pdf: inv.invoice_pdf, paid_at: paidAt };
          const { data: exists } = await db.from("renewal_payment_events").select("id, created_at")
            .eq("contract_id", c.id).eq("stripe_invoice_id", inv.id).limit(1).maybeSingle();
          if (exists) {
            // Corrigir movimentos antigos gravados com a data da sincronização
            const { error: upErr } = await db.from("renewal_payment_events")
              .update({ created_at: paidAt, metadata: evMeta }).eq("id", exists.id);
            if (upErr) console.error("[SYNC-STRIPE-RENEWALS] event date", exists.id, upErr.message);
          } else {
            await db.from("renewal_payment_events").insert({
              workspace_id, contract_id: c.id,
              stripe_event_id: `sync-${inv.id}`,
              event_type: "payment_succeeded",
              amount, currency,
              created_at: paidAt,
              stripe_invoice_id: inv.id,
              stripe_subscription_id: sub.id,
              metadata: evMeta,
            });
            added++;
          }

          // Refletir nas Faturas do FastCRM
          let { data: invExists } = await db.from("invoices").select("id")
            .eq("workspace_id", workspace_id).eq("external_provider", "stripe").eq("external_id", inv.id)
            .limit(1).maybeSingle();
          const day = paidAt.split("T")[0];
          // Associar fatura REN- já existente do mesmo contrato, mesmo valor e ±5 dias (evita duplicados)
          if (!invExists) {
            const d = new Date(paidAt);
            const from = new Date(d.getTime() - 5 * 86400000).toISOString().split("T")[0];
            const to = new Date(d.getTime() + 5 * 86400000).toISOString().split("T")[0];
            const { data: local } = await db.from("invoices").select("id")
              .eq("workspace_id", workspace_id).eq("renewal_contract_id", c.id).is("external_id", null)
              .eq("total", amount).gte("issue_date", from).lte("issue_date", to)
              .limit(1).maybeSingle();
            if (local) {
              await db.from("invoices").update({ external_provider: "stripe", external_id: inv.id }).eq("id", local.id);
              invExists = local;
            }
          }
          const invPayload = {
            issue_date: day, due_date: day, paid_at: paidAt,
            total: amount, subtotal: amount, amount_paid: amount, currency,
            external_url: inv.hosted_invoice_url || null, pdf_url: inv.invoice_pdf || null,
            status: "paid",
          };
          if (invExists) {
            await db.from("invoices").update({ paid_at: paidAt, amount_paid: amount, status: "paid", external_url: invPayload.external_url, pdf_url: invPayload.pdf_url }).eq("id", invExists.id);
          } else if (actorId) {
            const { data: newInv, error: insErr } = await db.from("invoices").insert({
              ...invPayload,
              workspace_id,
              invoice_number: inv.number || `STRIPE-${inv.id.slice(-8)}`,
              document_type: "invoice",
              client_name: inv.customer_name || inv.customer_email || "Cliente Stripe",
              client_email: inv.customer_email || null,
              company_id: c.company_id, contact_id: c.contact_id,
              renewal_contract_id: c.id,
              created_by: actorId,
              tax_amount: 0,
              external_provider: "stripe", external_id: inv.id,
              notes: `Pagamento Stripe sincronizado. Invoice: ${inv.id}`,
            }).select("id").maybeSingle();
            if (insErr) console.error("[SYNC-STRIPE-RENEWALS] invoice insert", inv.id, insErr.message);
            else invoicesAdded++;
            invExists = newInv ?? null;
          }
          // Garantir sempre linhas de itens (fatura sem itens fica incompleta)
          if (invExists) {
            const { count } = await db.from("invoice_items").select("id", { count: "exact", head: true }).eq("invoice_id", invExists.id);
            if (!count) {
              const { data: cItems } = await db.from("renewal_items").select("name, product_id").eq("contract_id", c.id);
              const desc = (cItems || []).map((x: any) => x.name).filter(Boolean).join(" + ")
                || inv.lines?.data?.[0]?.description || "Subscrição Stripe";
              const { error: itErr } = await db.from("invoice_items").insert({
                invoice_id: invExists.id, product_id: cItems?.[0]?.product_id ?? null,
                description: desc, quantity: 1, unit_price: amount, discount_percent: 0,
                tax_rate: 0, total: amount, position: 1,
              });
              if (itErr) console.error("[SYNC-STRIPE-RENEWALS] items insert", inv.id, itErr.message);
            }
          }
        }
        results.push({ contract_id: c.id, ok: true, stripe_status: sub.status, next_renewal_date: next, payments_added: added, invoices_added: invoicesAdded });
      } catch (e: any) {
        console.error("[SYNC-STRIPE-RENEWALS]", c.id, e?.message);
        results.push({ contract_id: c.id, ok: false, error: e?.message || "Erro" });
      }
    }

    for (const r of results) r.auto_linked = linked.includes(r.contract_id);
    return json({ success: true, synced: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, auto_linked: linked.length, results });
  } catch (e: any) {
    console.error("[SYNC-STRIPE-RENEWALS] fatal", e?.message);
    return json({ success: false, error: "internal_error" });
  }
});
