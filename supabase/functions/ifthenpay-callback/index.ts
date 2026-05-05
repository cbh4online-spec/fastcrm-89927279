// ifthenpay anti-phishing callback handler
// Public endpoint (no JWT) — validated via shared secret per workspace
//
// Expected URL format:
//   https://<project>.supabase.co/functions/v1/ifthenpay-callback
//     ?workspace=<slug>
//     &key=<anti_phishing_key>
//     &orderId=<ifthenpay_order_id>
//     &amount=<amount>
//     &requestId=<ifthenpay request id>            (mbway/cc/payshop)
//     &reference=<mb reference>                    (multibanco)
//     &entity=<mb entity>                          (multibanco)
//     &payment_datetime=<datetime>                 (optional)
//
// Always returns HTTP 200 (ifthenpay would otherwise retry forever).
// Logs every callback in ifthenpay_callback_logs for audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Extract query params (ifthenpay uses GET; we also accept POST for robustness)
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (params[k] = v));

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;

  const workspaceSlug = (params.workspace || "").trim().toLowerCase();
  const providedKey = params.key || "";
  const ifthenpayOrderId = params.orderId || params.id || "";
  const amountStr = params.amount || "";

  // Helper to write a log entry (best-effort)
  async function logCallback(
    outcome: string,
    extras: { workspace_id?: string | null; payment_id?: string | null; error_message?: string | null } = {},
  ) {
    try {
      await supabase.from("ifthenpay_callback_logs").insert({
        workspace_id: extras.workspace_id ?? null,
        payment_id: extras.payment_id ?? null,
        query_params: params,
        outcome,
        error_message: extras.error_message ?? null,
        request_ip: ip,
      });
    } catch (e) {
      console.error("[ifthenpay-callback] failed to write log", e);
    }
  }

  try {
    if (!workspaceSlug) {
      await logCallback("rejected_unknown_workspace", { error_message: "missing workspace param" });
      return ok({ status: "rejected" });
    }

    // Resolve workspace by slug (security definer RPC)
    const { data: workspaceId, error: resolveErr } = await supabase.rpc(
      "ifthenpay_resolve_workspace_by_slug",
      { p_slug: workspaceSlug },
    );

    if (resolveErr || !workspaceId) {
      await logCallback("rejected_unknown_workspace", {
        error_message: `slug=${workspaceSlug} not found`,
      });
      return ok({ status: "rejected" });
    }

    // Load settings
    const { data: settings, error: settingsErr } = await supabase
      .from("ifthenpay_settings")
      .select("anti_phishing_key, is_active")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (settingsErr || !settings) {
      await logCallback("rejected_unknown_workspace", {
        workspace_id: workspaceId as string,
        error_message: "settings not found",
      });
      return ok({ status: "rejected" });
    }

    // Validate anti-phishing key (constant-time comparison)
    const expected = settings.anti_phishing_key || "";
    if (!providedKey || providedKey.length !== expected.length) {
      await logCallback("rejected_key", { workspace_id: workspaceId as string });
      return ok({ status: "rejected" });
    }
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ providedKey.charCodeAt(i);
    }
    if (mismatch !== 0) {
      await logCallback("rejected_key", { workspace_id: workspaceId as string });
      return ok({ status: "rejected" });
    }

    // Locate payment
    if (!ifthenpayOrderId) {
      await logCallback("rejected_unknown_payment", {
        workspace_id: workspaceId as string,
        error_message: "missing orderId",
      });
      return ok({ status: "rejected" });
    }

    const { data: payment, error: paymentErr } = await supabase
      .from("ifthenpay_payments")
      .select("id, status, workspace_id, amount")
      .eq("ifthenpay_order_id", ifthenpayOrderId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (paymentErr || !payment) {
      await logCallback("rejected_unknown_payment", {
        workspace_id: workspaceId as string,
        error_message: `orderId=${ifthenpayOrderId} not found`,
      });
      return ok({ status: "rejected" });
    }

    // Idempotency: if already paid, ignore silently
    if (payment.status === "paid") {
      await logCallback("duplicate_ignored", {
        workspace_id: workspaceId as string,
        payment_id: payment.id,
      });
      return ok({ status: "already_paid" });
    }

    // Mark as paid
    const paidAmount = amountStr ? Number(amountStr) : payment.amount;
    const { error: updErr } = await supabase
      .from("ifthenpay_payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_amount: paidAmount,
        metadata: params,
      })
      .eq("id", payment.id);

    if (updErr) {
      await logCallback("error", {
        workspace_id: workspaceId as string,
        payment_id: payment.id,
        error_message: updErr.message,
      });
      return ok({ status: "error_recorded" });
    }

    await logCallback("accepted", {
      workspace_id: workspaceId as string,
      payment_id: payment.id,
    });

    // TODO (Fase 3): atualizar order/invoice associada + activity_logs + notificação

    return ok({ status: "accepted" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ifthenpay-callback] internal error", msg);
    await logCallback("error", { error_message: msg });
    // Always 200 to prevent retries flooding logs; we already recorded the error
    return ok({ status: "error_recorded", fallback: true });
  }
});
