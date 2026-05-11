// ifthenpay-create-payment
// Cria pagamentos via ifthenpay nos 5 métodos suportados.
// Requer JWT autenticado e que o utilizador pertença ao workspace.
//
// Body:
//   {
//     workspace_id: uuid,
//     method: "multibanco" | "mbway" | "cc" | "payshop" | "pix",
//     amount: number (>0),
//     currency?: string (default EUR),
//     reference_type: "order" | "invoice" | "subscription" | "manual",
//     reference_id?: uuid,
//     description?: string,
//     mbway_phone?: string,           // obrigatório se method=mbway
//     return_url?: string,            // cc/pix
//     cancel_url?: string,            // cc
//     expires_in_days?: number        // multibanco/payshop (override)
//   }
//
// Resposta normalizada:
//   { ok: true, payment: { id, method, status, ... method-specific fields } }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Method = "multibanco" | "mbway" | "cc" | "payshop" | "pix";

interface Body {
  workspace_id: string;
  method: Method;
  amount: number;
  currency?: string;
  reference_type: "order" | "invoice" | "subscription" | "manual";
  reference_id?: string | null;
  description?: string;
  mbway_phone?: string;
  return_url?: string;
  cancel_url?: string;
  expires_in_days?: number;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  // Always return 200 OK with { ok: false } when status >= 500 to keep client resilient
  if (status >= 500) {
    return json({ ok: false, error: message, fallback: true, ...extra }, 200);
  }
  return json({ ok: false, error: message, ...extra }, status);
}

function genOrderId(): string {
  // Max 15 chars (multibanco), alfanumérico
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LV${ts}${rnd}`.slice(0, 15);
}

function validate(b: Partial<Body>): string | null {
  if (!b.workspace_id) return "workspace_id é obrigatório";
  if (!b.method || !["multibanco", "mbway", "cc", "payshop", "pix"].includes(b.method))
    return "method inválido";
  if (typeof b.amount !== "number" || b.amount <= 0) return "amount inválido";
  if (!b.reference_type || !["order", "invoice", "subscription", "manual"].includes(b.reference_type))
    return "reference_type inválido";
  if (b.method === "mbway" && !b.mbway_phone) return "mbway_phone é obrigatório";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return fail("Não autenticado", 401);

    // Validate user via anon client + JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return fail("Sessão inválida", 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as Partial<Body> | null;
    if (!body) return fail("JSON inválido");
    const verr = validate(body);
    if (verr) return fail(verr);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Authorization: user must belong to workspace
    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", body.workspace_id!)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) {
      const { data: superFlag } = await admin.rpc("is_super_admin", { _user_id: userId });
      if (!superFlag) return fail("Sem acesso ao workspace", 403);
    }

    // Load ifthenpay settings
    const { data: settings, error: setErr } = await admin
      .from("ifthenpay_settings")
      .select("*")
      .eq("workspace_id", body.workspace_id!)
      .maybeSingle();
    if (setErr || !settings) return fail("ifthenpay não configurado neste workspace", 412);
    if (!settings.is_active) return fail("Gateway ifthenpay está desativado", 412);

    const method = body.method as Method;
    const enabled: string[] = settings.enabled_methods || [];
    if (enabled.length && !enabled.includes(method))
      return fail(`Método '${method}' desativado nas configurações`, 412);

    const amount = Number(body.amount).toFixed(2);
    const currency = (body.currency || "EUR").toUpperCase();
    const orderId = genOrderId();
    const description = (body.description || `Pagamento ${orderId}`).slice(0, 100);

    // Per-method credentials check
    const requireKey = (k: string | null | undefined, label: string) => {
      if (!k) throw new Error(`${label} não configurada em ifthenpay_settings`);
      return k;
    };

    let paymentRow: Record<string, unknown> = {
      workspace_id: body.workspace_id,
      reference_type: body.reference_type,
      reference_id: body.reference_id ?? null,
      method,
      amount: Number(amount),
      currency,
      ifthenpay_order_id: orderId,
      status: "pending",
      metadata: { description, requested_by: userId, test_mode: settings.test_mode },
    };

    try {
      if (method === "multibanco") {
        const mbKey = requireKey(settings.mb_key, "mb_key");
        const expiry = body.expires_in_days ?? settings.expiry_days ?? 3;
        const url = `https://ifthenpay.com/api/multibanco/reference/init`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mbKey,
            orderId,
            amount,
            description,
            expiryDays: expiry,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.Reference) throw new Error(data?.Message || `Multibanco erro ${r.status}`);
        paymentRow = {
          ...paymentRow,
          mb_entidade: data.Entity,
          mb_referencia: data.Reference,
          mb_expiry_date: data.ExpiryDate || null,
          metadata: { ...(paymentRow.metadata as object), provider_response: data },
        };
      } else if (method === "mbway") {
        const key = requireKey(settings.mbway_key, "mbway_key");
        const url = `https://ifthenpay.com/api/spg/payment/mbway`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mbWayKey: key,
            orderId,
            amount,
            mobileNumber: body.mbway_phone,
            description,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data?.Status !== "000") throw new Error(data?.Message || `MBWAY erro ${r.status}`);
        paymentRow = {
          ...paymentRow,
          mbway_request_id: data.RequestId,
          mbway_phone: body.mbway_phone,
          metadata: { ...(paymentRow.metadata as object), provider_response: data },
        };
      } else if (method === "cc") {
        const key = requireKey(settings.cc_key, "cc_key");
        const url = `https://ifthenpay.com/api/creditcard/init/${key}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount,
            description,
            url_redirect: body.return_url || "",
            url_cancel: body.cancel_url || body.return_url || "",
            language: "PT",
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.PaymentUrl) throw new Error(data?.Message || `CC erro ${r.status}`);
        paymentRow = {
          ...paymentRow,
          cc_request_id: data.RequestId,
          cc_payment_url: data.PaymentUrl,
          metadata: { ...(paymentRow.metadata as object), provider_response: data },
        };
      } else if (method === "payshop") {
        const key = requireKey(settings.payshop_key, "payshop_key");
        const expiry = body.expires_in_days ?? settings.expiry_days ?? 7;
        const url = `https://ifthenpay.com/api/payshop/reference/init`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payshopKey: key,
            orderId,
            amount,
            validade: new Date(Date.now() + expiry * 86400_000).toISOString().slice(0, 10),
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.Reference) throw new Error(data?.Message || `Payshop erro ${r.status}`);
        paymentRow = {
          ...paymentRow,
          payshop_reference: data.Reference,
          metadata: { ...(paymentRow.metadata as object), provider_response: data },
        };
      } else if (method === "pix") {
        const key = requireKey(settings.pix_key, "pix_key");
        const url = `https://ifthenpay.com/api/pix/init`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pixKey: key,
            orderId,
            amount,
            description,
            returnUrl: body.return_url || "",
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.Message || `Pix erro ${r.status}`);
        paymentRow = {
          ...paymentRow,
          metadata: {
            ...(paymentRow.metadata as object),
            provider_response: data,
            pix_qr: data?.QrCode || data?.qr_code || null,
            pix_copia_cola: data?.CopyPaste || data?.copy_paste || null,
          },
        };
      }
    } catch (provErr) {
      const msg = provErr instanceof Error ? provErr.message : String(provErr);
      console.error("[ifthenpay-create-payment] provider error", msg);
      return fail(`Falha no provider ifthenpay: ${msg}`, 502);
    }

    const { data: inserted, error: insErr } = await admin
      .from("ifthenpay_payments")
      .insert(paymentRow)
      .select("*")
      .single();
    if (insErr) return fail(`Erro a guardar pagamento: ${insErr.message}`, 500);

    return json({ ok: true, payment: inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ifthenpay-create-payment] internal error", msg);
    return json({ ok: false, error: msg, fallback: true, internal_error: true }, 200);
  }
});
