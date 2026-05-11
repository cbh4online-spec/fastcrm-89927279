// Public endpoint to fetch invoice info + create ifthenpay payment by token (no auth)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const IFTHENPAY_BASE = "https://ifthenpay.com/api";

interface PayBody {
  token: string;
  method: "multibanco" | "mbway" | "cc" | "payshop" | "pix";
  mbway_phone?: string;
  return_url?: string;
  cancel_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const url = new URL(req.url);

    // GET ?token=...  -> returns invoice public summary
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) return json(400, { ok: false, error: "Missing token" });

      const { data: inv, error } = await admin
        .from("invoices")
        .select("id, workspace_id, invoice_number, client_name, total, amount_paid, currency, status, due_date, document_type")
        .eq("public_token", token)
        .maybeSingle();
      if (error || !inv) return json(404, { ok: false, error: "Invoice not found" });

      const { data: ws } = await admin
        .from("workspaces")
        .select("id, name, slug")
        .eq("id", inv.workspace_id)
        .maybeSingle();

      const { data: settings } = await admin
        .from("ifthenpay_settings")
        .select("is_active, enabled_methods")
        .eq("workspace_id", inv.workspace_id)
        .maybeSingle();

      const remaining = Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0));

      return json(200, {
        ok: true,
        invoice: {
          id: inv.id,
          number: inv.invoice_number,
          client_name: inv.client_name,
          total: Number(inv.total),
          amount_paid: Number(inv.amount_paid || 0),
          remaining,
          currency: inv.currency,
          status: inv.status,
          due_date: inv.due_date,
          document_type: inv.document_type,
        },
        workspace: ws ? { name: ws.name, slug: ws.slug } : null,
        payment_methods: settings?.is_active ? (settings.enabled_methods || []) : [],
      });
    }

    // POST -> create payment
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const body = (await req.json()) as PayBody;
    if (!body?.token || !body?.method) return json(400, { ok: false, error: "Missing token/method" });

    const { data: inv } = await admin
      .from("invoices")
      .select("id, workspace_id, invoice_number, total, amount_paid, currency, client_name, client_email")
      .eq("public_token", body.token)
      .maybeSingle();
    if (!inv) return json(404, { ok: false, error: "Invoice not found" });

    const { data: settings } = await admin
      .from("ifthenpay_settings")
      .select("*")
      .eq("workspace_id", inv.workspace_id)
      .maybeSingle();
    if (!settings?.is_active) return json(400, { ok: false, error: "Pagamento online indisponível" });
    if (!(settings.enabled_methods || []).includes(body.method)) {
      return json(400, { ok: false, error: "Método não disponível" });
    }

    const remaining = Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0));
    if (remaining <= 0) return json(400, { ok: false, error: "Fatura já paga" });

    const orderId = `LV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const amountStr = remaining.toFixed(2);

    let providerResp: any = {};
    let paymentRow: any = {
      workspace_id: inv.workspace_id,
      reference_type: "invoice",
      reference_id: inv.id,
      method: body.method,
      amount: remaining,
      currency: inv.currency || "EUR",
      status: "pending",
      ifthenpay_order_id: orderId,
      metadata: { source: "public_invoice_link", invoice_number: inv.invoice_number },
    };

    try {
      if (body.method === "multibanco") {
        if (!settings.mb_key) return json(400, { ok: false, error: "Multibanco não configurado" });
        const expiry = new Date(Date.now() + (settings.expiry_days || 7) * 86400000)
          .toISOString().slice(0, 10);
        const r = await fetch(
          `${IFTHENPAY_BASE}/multibanco/reference/init`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mbKey: settings.mb_key,
              orderId,
              amount: amountStr,
              description: `Fatura ${inv.invoice_number}`,
              expiryDate: expiry,
            }),
          },
        );
        providerResp = await r.json();
        paymentRow.mb_entidade = providerResp.Entity || providerResp.entity;
        paymentRow.mb_referencia = providerResp.Reference || providerResp.reference;
        paymentRow.mb_expiry_date = expiry;
      } else if (body.method === "mbway") {
        if (!settings.mbway_key) return json(400, { ok: false, error: "MB WAY não configurado" });
        if (!body.mbway_phone) return json(400, { ok: false, error: "Telemóvel MB WAY obrigatório" });
        const r = await fetch(`${IFTHENPAY_BASE}/spg/payment/mbway`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mbWayKey: settings.mbway_key,
            orderId,
            amount: amountStr,
            mobileNumber: body.mbway_phone,
            email: inv.client_email || "",
            description: `Fatura ${inv.invoice_number}`,
          }),
        });
        providerResp = await r.json();
        paymentRow.mbway_request_id = providerResp.RequestId || providerResp.requestId;
        paymentRow.mbway_phone = body.mbway_phone;
      } else if (body.method === "cc") {
        if (!settings.cc_key) return json(400, { ok: false, error: "Cartão não configurado" });
        const r = await fetch(`${IFTHENPAY_BASE}/creditcard/init/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ccKey: settings.cc_key,
            orderId,
            amount: amountStr,
            description: `Fatura ${inv.invoice_number}`,
            url_redirect: body.return_url || "",
            url_cancel: body.cancel_url || "",
          }),
        });
        providerResp = await r.json();
        paymentRow.cc_request_id = providerResp.RequestId || providerResp.requestId;
        paymentRow.cc_payment_url = providerResp.PaymentUrl || providerResp.paymentUrl;
      } else if (body.method === "payshop") {
        if (!settings.payshop_key) return json(400, { ok: false, error: "Payshop não configurado" });
        const validity = new Date(Date.now() + (settings.expiry_days || 7) * 86400000)
          .toISOString().slice(0, 10);
        const r = await fetch(`${IFTHENPAY_BASE}/payshop/reference/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payshopKey: settings.payshop_key,
            orderId,
            amount: amountStr,
            validity,
          }),
        });
        providerResp = await r.json();
        paymentRow.payshop_reference = providerResp.Reference || providerResp.reference;
        paymentRow.mb_expiry_date = validity;
      } else if (body.method === "pix") {
        if (!settings.pix_key) return json(400, { ok: false, error: "Pix não configurado" });
        const r = await fetch(`${IFTHENPAY_BASE}/pix/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pixKey: settings.pix_key,
            orderId,
            amount: amountStr,
            description: `Fatura ${inv.invoice_number}`,
          }),
        });
        providerResp = await r.json();
        paymentRow.cc_payment_url = providerResp.PaymentUrl || providerResp.paymentUrl;
      }
    } catch (apiErr) {
      console.error("ifthenpay api error", apiErr);
      return json(200, { ok: false, fallback: true, error: "Falha temporária no provedor de pagamento" });
    }

    paymentRow.metadata = { ...paymentRow.metadata, provider_response: providerResp };

    const { data: created, error: insErr } = await admin
      .from("ifthenpay_payments")
      .insert(paymentRow)
      .select("*")
      .single();

    if (insErr) {
      console.error("insert ifthenpay_payments", insErr);
      return json(200, { ok: false, fallback: true, error: "Erro ao registar pagamento" });
    }

    return json(200, { ok: true, payment: created });
  } catch (e) {
    console.error("invoice-pay-public fatal", e);
    return json(200, { ok: false, internal_error: true, error: "Erro interno" });
  }
});
