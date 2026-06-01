// Pull document state from InvoiceXpress back into FastCRM invoices.
// Modes:
//   - { invoice_id }            → sync one invoice (auth required, user must be member)
//   - { workspace_id }          → sync all linked invoices of a workspace (auth required, member)
//   - {} with service-role auth → sync all linked invoices across all workspaces (cron)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PROVIDER = "invoicexpress";

const TYPE_PATH: Record<string, string> = {
  invoice: "invoices",
  invoice_receipt: "invoice_receipts",
  simplified_invoice: "simplified_invoices",
  credit_note: "credit_notes",
};
const TYPE_ROOT: Record<string, string> = {
  invoice: "invoice",
  invoice_receipt: "invoice_receipt",
  simplified_invoice: "simplified_invoice",
  credit_note: "credit_note",
};
const PROBE_ORDER = ["invoice", "invoice_receipt", "simplified_invoice", "credit_note"];

function normalizeAccount(value: string): string {
  const raw = (value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.match(/^https?:\/\//) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host.endsWith(".app.invoicexpress.com"))
      return host.replace(/\.app\.invoicexpress\.com$/, "");
    if (!host.includes(".")) return host;
  } catch { /* */ }
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.app\.invoicexpress\.com.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
}

async function fetchDocument(
  account: string,
  apiKey: string,
  type: string,
  externalId: string,
): Promise<{ status: number; data: any } | null> {
  const path = TYPE_PATH[type];
  if (!path) return null;
  const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/${path}/${encodeURIComponent(externalId)}.json?api_key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    const txt = await r.text();
    let data: any = null;
    try { data = JSON.parse(txt); } catch { data = txt; }
    return { status: r.status, data };
  } catch (e) {
    console.error("[ix-sync] fetch_error", type, externalId, e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function syncInvoice(
  admin: any,
  invoice: any,
  integrationsByWs: Map<string, any>,
): Promise<{ ok: boolean; state?: string; error?: string }> {
  const integ = integrationsByWs.get(invoice.workspace_id);
  if (!integ) return { ok: false, error: "no_integration" };
  const account = normalizeAccount(integ.account_name);
  if (!account) return { ok: false, error: "invalid_account" };
  if (!invoice.external_id) return { ok: false, error: "no_external_id" };

  const types = invoice.external_document_type
    ? [invoice.external_document_type]
    : PROBE_ORDER;

  let found: { type: string; data: any } | null = null;
  for (const t of types) {
    const res = await fetchDocument(account, integ.api_key_encrypted, t, invoice.external_id);
    if (!res) continue;
    if (res.status >= 200 && res.status < 300) {
      const doc = res.data?.[TYPE_ROOT[t]] || res.data;
      found = { type: t, data: doc };
      break;
    }
    if (res.status === 404) continue;
    return { ok: false, error: `upstream_${res.status}` };
  }

  if (!found) return { ok: false, error: "not_found_upstream" };

  const state = String(found.data?.status || "").toLowerCase() || null;
  const sequence =
    found.data?.sequence_number || found.data?.inverted_sequence_number || null;
  const permalink = found.data?.permalink || invoice.external_url;

  await admin
    .from("invoices")
    .update({
      external_state: state,
      external_sequence_number: sequence,
      external_url: permalink,
      external_document_type: found.type,
      external_state_synced_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  return { ok: true, state: state || undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole =
      authHeader === `Bearer ${serviceRoleKey}` ||
      req.headers.get("apikey") === serviceRoleKey;

    const body = (req.method === "POST" ? await req.json().catch(() => ({})) : {}) as {
      invoice_id?: string;
      workspace_id?: string;
    };

    let workspaceFilter: string | null = null;
    let invoiceIdFilter: string | null = null;
    let cronMode = false;

    if (body.invoice_id) {
      invoiceIdFilter = body.invoice_id;
    } else if (body.workspace_id) {
      workspaceFilter = body.workspace_id;
    } else {
      // No filter → cron/background mode (counts only, no per-invoice data leak)
      cronMode = true;
    }

    if (!isServiceRole && !cronMode) {
      if (!authHeader.startsWith("Bearer "))
        return json({ ok: false, error: "Unauthorized" }, 200);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims } = await userClient.auth.getClaims(token);
      const userId = claims?.claims?.sub as string | undefined;
      if (!userId) return json({ ok: false, error: "Unauthorized" }, 200);

      let wsId = workspaceFilter;
      if (invoiceIdFilter) {
        const { data: inv } = await admin
          .from("invoices")
          .select("workspace_id")
          .eq("id", invoiceIdFilter)
          .maybeSingle();
        if (!inv) return json({ ok: false, error: "Fatura não encontrada" }, 200);
        wsId = inv.workspace_id;
      }
      const { data: isMember } = await userClient.rpc("is_workspace_member", {
        _user_id: userId,
        _workspace_id: wsId,
      });
      const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: userId });
      if (!isMember && !isSuper)
        return json({ ok: false, error: "Sem permissão" }, 200);
    }

    let invQ = admin
      .from("invoices")
      .select("id, workspace_id, external_id, external_document_type, external_url, external_state")
      .eq("external_provider", PROVIDER)
      .not("external_id", "is", null);
    if (invoiceIdFilter) invQ = invQ.eq("id", invoiceIdFilter);
    if (workspaceFilter) invQ = invQ.eq("workspace_id", workspaceFilter);
    if (!invoiceIdFilter && isServiceRole) {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      invQ = invQ
        .or(`external_state_synced_at.is.null,external_state_synced_at.lt.${fifteenMinAgo}`)
        .or("external_state.is.null,external_state.in.(draft,sent,settled,partial)")
        .limit(200);
    }

    const { data: invoices, error: invErr } = await invQ;
    if (invErr) return json({ ok: false, error: invErr.message }, 200);
    if (!invoices?.length)
      return json({ ok: true, synced: 0, results: [] });

    const wsIds = Array.from(new Set(invoices.map((i: any) => i.workspace_id)));
    const { data: integrations } = await admin
      .from("workspace_billing_integrations")
      .select("workspace_id, account_name, api_key_encrypted, is_default, is_active")
      .in("workspace_id", wsIds)
      .eq("provider", PROVIDER)
      .eq("is_active", true)
      .order("is_default", { ascending: false });

    const integByWs = new Map<string, any>();
    for (const i of integrations || []) {
      if (!integByWs.has(i.workspace_id)) integByWs.set(i.workspace_id, i);
    }

    const results: Array<{ id: string; ok: boolean; state?: string; error?: string }> = [];
    let okCount = 0;
    for (const inv of invoices) {
      const r = await syncInvoice(admin, inv, integByWs);
      results.push({ id: inv.id, ...r });
      if (r.ok) okCount++;
    }

    return json({ ok: true, synced: okCount, total: invoices.length, results });
  } catch (e) {
    console.error("[invoicexpress-sync-document-state] internal_error", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "internal_error" },
      200,
    );
  }
});
