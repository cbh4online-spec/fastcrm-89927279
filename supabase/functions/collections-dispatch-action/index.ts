// collections-dispatch-action
// Envia efectivamente uma acção de cobrança (email / WhatsApp) e regista o resultado.
// Pode ser chamada por um utilizador autenticado (membro da workspace ou super admin)
// ou internamente pelo collections-auto-executor com a service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "../_shared/cors.ts";
import { zapiCall, safeJson, type ZapiCredentials } from "../_shared/zapi.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Máximo de envios automáticos por workspace por dia (anti-spam). */
const DAILY_AUTOMATED_LIMIT = 200;

interface DispatchBody {
  /** Acção já criada (fluxo automático) */
  actionId?: string;
  /** Fluxo manual: cria a acção e envia */
  caseId?: string;
  channel?: "email" | "whatsapp";
  actionType?: string;
  subject?: string;
  body?: string;
}

function jsonRes(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function euro(n: number | null | undefined): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    Number(n ?? 0),
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) =>
    vars[key.toLowerCase()] ?? "",
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const correlationId = crypto.randomUUID();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return jsonRes({ ok: false, error: "Unauthorized" }, 401);

    const internal = token === SERVICE_ROLE;
    let userId: string | null = null;

    if (!internal) {
      const { data: userData, error: userErr } = await createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }).auth.getUser();
      if (userErr || !userData?.user) return jsonRes({ ok: false, error: "Unauthorized" }, 401);
      userId = userData.user.id;
    }

    const payload = (await req.json()) as DispatchBody;

    // ── Resolver ou criar a acção ────────────────────────────────
    let action: any = null;

    if (payload.actionId) {
      const { data, error } = await admin
        .from("collection_actions")
        .select("*")
        .eq("id", payload.actionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonRes({ ok: false, error: "action_not_found" }, 404);
      action = data;
    } else {
      if (!payload.caseId || !payload.channel) {
        return jsonRes({ ok: false, error: "caseId e channel são obrigatórios" }, 400);
      }
    }

    const caseId = action?.case_id ?? payload.caseId!;
    const { data: caseRow, error: caseErr } = await admin
      .from("collection_cases")
      .select("*")
      .eq("id", caseId)
      .maybeSingle();
    if (caseErr) throw caseErr;
    if (!caseRow) return jsonRes({ ok: false, error: "case_not_found" }, 404);

    const workspaceId = caseRow.workspace_id as string;

    // ── Autorização (fluxo com utilizador) ───────────────────────
    if (!internal) {
      const { data: membership } = await admin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userId });
        if (!isSuper) return jsonRes({ ok: false, error: "Not a workspace member" }, 403);
      }
    }

    const channel: string = action?.channel ?? payload.channel!;
    if (channel !== "email" && channel !== "whatsapp") {
      return jsonRes({ ok: false, error: "channel_not_supported", channel }, 400);
    }

    // ── Limite diário de envios automáticos ──────────────────────
    if (internal) {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const { count } = await admin
        .from("collection_actions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_automated", true)
        .gte("created_at", since.toISOString());
      if ((count ?? 0) > DAILY_AUTOMATED_LIMIT) {
        return jsonRes({ ok: false, error: "daily_limit_reached", limit: DAILY_AUTOMATED_LIMIT });
      }
    }

    // ── Variáveis do template ────────────────────────────────────
    const { data: invoices } = await admin
      .from("collection_case_invoices")
      .select("snapshot_total, snapshot_amount_paid, snapshot_due_date, invoice:invoices(invoice_number)")
      .eq("case_id", caseId)
      .is("removed_at", null)
      .order("snapshot_due_date", { ascending: true })
      .limit(50);

    const invoiceLines = (invoices ?? [])
      .map((i: any) => {
        const open = Number(i.snapshot_total ?? 0) - Number(i.snapshot_amount_paid ?? 0);
        return `• ${i.invoice?.invoice_number ?? "s/ nº"} — ${euro(open)} (venc. ${
          i.snapshot_due_date ?? "—"
        })`;
      })
      .join("\n");

    const vars: Record<string, string> = {
      nome: caseRow.debtor_name ?? "Cliente",
      total_em_divida: euro(Number(caseRow.total_due ?? 0) - Number(caseRow.total_paid ?? 0)),
      total_faturado: euro(caseRow.total_due),
      total_pago: euro(caseRow.total_paid),
      dias_atraso: String(caseRow.days_overdue ?? 0),
      num_faturas: String(caseRow.invoices_count ?? 0),
      lista_faturas: invoiceLines || "—",
      nif: caseRow.debtor_tax_id ?? "",
    };

    const rawSubject = action?.subject ?? payload.subject ?? "Regularização de valores em dívida";
    const rawBody = action?.body ?? payload.body ?? "";
    const subject = renderTemplate(rawSubject, vars);
    const body = renderTemplate(rawBody, vars);

    // ── Criar a acção no fluxo manual ────────────────────────────
    if (!action) {
      const { data: created, error: insErr } = await admin
        .from("collection_actions")
        .insert([
          {
            workspace_id: workspaceId,
            case_id: caseId,
            action_type: (payload.actionType ??
              (channel === "email" ? "email_sent" : "whatsapp_sent")) as never,
            channel: channel as never,
            subject: channel === "email" ? subject : null,
            body,
            performed_by: userId,
            is_automated: false,
            metadata: { correlation_id: correlationId, delivery: { status: "sending" } } as never,
          },
        ])
        .select()
        .single();
      if (insErr) throw insErr;
      action = created;
    }

    // ── Envio ────────────────────────────────────────────────────
    let delivery: Record<string, unknown> = { status: "failed", error: "unknown" };

    if (channel === "email") {
      const to = caseRow.debtor_email as string | null;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!to) {
        delivery = { status: "manual", reason: "no_email" };
      } else if (!resendKey) {
        delivery = { status: "manual", reason: "email_provider_not_configured" };
      } else {
        const html = `<div style="font-family:system-ui,sans-serif;max-width:620px;margin:0 auto;color:#111">
  <p style="white-space:pre-line">${escapeHtml(body)}</p>
</div>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FastCRM <noreply@fastcrm.pt>",
            to: [to],
            subject,
            html,
          }),
        });
        const out = await safeJson(res);
        delivery = res.ok
          ? { status: "sent", provider: "resend", provider_id: out?.id ?? null }
          : { status: "failed", provider: "resend", error: out?.message ?? `HTTP ${res.status}` };
      }
    } else {
      const phone = (caseRow.debtor_phone as string | null)?.replace(/\D/g, "");
      const { data: conn } = await admin
        .from("whatsapp_zapi_connections")
        .select("instance_id, instance_token, client_token, status")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!phone) {
        delivery = { status: "manual", reason: "no_phone" };
      } else if (!conn?.instance_id || !conn?.instance_token) {
        delivery = { status: "manual", reason: "whatsapp_not_configured" };
      } else {
        const creds: ZapiCredentials = {
          instanceId: conn.instance_id,
          instanceToken: conn.instance_token,
          clientToken: conn.client_token ?? Deno.env.get("ZAPI_MASTER_ADMIN_TOKEN") ?? "",
        };
        const res = await zapiCall(creds, "/send-text", {
          method: "POST",
          body: JSON.stringify({ phone, message: body }),
        });
        const out = await safeJson(res);
        delivery = res.ok
          ? { status: "sent", provider: "zapi", provider_id: out?.messageId ?? null }
          : { status: "failed", provider: "zapi", error: out?.error ?? `HTTP ${res.status}` };
      }
    }

    // ── Persistir resultado ──────────────────────────────────────
    const metadata = {
      ...((action.metadata as Record<string, unknown>) ?? {}),
      correlation_id: correlationId,
      delivery: { ...delivery, at: new Date().toISOString() },
      rendered: { subject, body },
    };

    await admin
      .from("collection_actions")
      .update({ metadata: metadata as never, subject, body })
      .eq("id", action.id);

    await admin
      .from("collection_cases")
      .update({ last_action_at: new Date().toISOString() })
      .eq("id", caseId);

    console.log(
      "[collections-dispatch-action]",
      JSON.stringify({ correlationId, caseId, channel, delivery }),
    );

    return jsonRes({ ok: true, action_id: action.id, delivery, correlation_id: correlationId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[collections-dispatch-action] fatal", message);
    return jsonRes({ ok: false, internal_error: true, error: message, correlation_id: correlationId });
  }
});
