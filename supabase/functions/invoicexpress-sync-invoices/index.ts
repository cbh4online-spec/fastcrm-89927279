// InvoiceXpress → CRM invoice sync (incremental)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PROVIDER = "invoicexpress";
// IX statuses: draft (DR), sent (SE), settled (ST), canceled (CA), second copy (SC)
function mapStatus(ixStatus: string | undefined, dueDate?: string, paid?: boolean): string {
  const s = (ixStatus || "").toLowerCase();
  if (paid || s === "settled" || s === "paid") return "paid";
  if (s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "draft") return "draft";
  if (s === "sent") {
    if (dueDate && new Date(dueDate) < new Date()) return "overdue";
    return "sent";
  }
  return s || "draft";
}

const SUPPORTED_TYPES = new Set([
  "Invoice",
  "InvoiceReceipt",
  "SimplifiedInvoice",
  "CreditNote",
]);
const TYPE_TO_PATH: Record<string, string> = {
  Invoice: "invoices",
  InvoiceReceipt: "invoice_receipts",
  SimplifiedInvoice: "simplified_invoices",
  CreditNote: "credit_notes",
};

interface IXDoc {
  id: number;
  type: string;
  status: string;
  sequence_number?: string;
  inverted_sequence_number?: string;
  date?: string; // issue
  due_date?: string;
  saved_at?: string;
  sum?: string | number;
  discount?: string | number;
  before_taxes?: string | number;
  taxes?: string | number;
  total?: string | number;
  currency?: string;
  observations?: string;
  permalink?: string;
  client?: {
    id?: number;
    name?: string;
    email?: string;
    code?: string;
    fiscal_id?: string;
    address?: string;
    country?: string;
  };
}

async function fetchIXPage(account: string, apiKey: string, path: string, since: string, page: number) {
  const qs = new URLSearchParams({
    api_key: apiKey,
    page: String(page),
    "filter[from_date]": since,
  });
  const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/${path}.json?${qs.toString()}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
      if (r.status === 429 || r.status >= 500) {
        if (attempts < 2) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
      }
      const txt = await r.text();
      let data: any = null;
      try { data = JSON.parse(txt); } catch { /* */ }
      clearTimeout(t);
      return { ok: r.ok, status: r.status, data, raw: txt };
    } catch (e) {
      if (attempts >= 2) {
        clearTimeout(t);
        throw e;
      }
    }
  }
  clearTimeout(t);
  return { ok: false, status: 0, data: null, raw: "" };
}

async function resolveClient(admin: any, workspaceId: string, ixClient?: IXDoc["client"]) {
  if (!ixClient) return { company_id: null, contact_id: null };
  let company_id: string | null = null;
  let contact_id: string | null = null;
  const nif = (ixClient.fiscal_id || "").trim();
  const email = (ixClient.email || "").trim().toLowerCase();
  if (nif) {
    const { data } = await admin
      .from("companies")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("tax_id", nif)
      .limit(1)
      .maybeSingle();
    if (data?.id) company_id = data.id;
  }
  if (email) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (data?.id) contact_id = data.id;
  }
  return { company_id, contact_id };
}

async function upsertInvoice(admin: any, workspaceId: string, userId: string | null, doc: IXDoc) {
  const externalId = String(doc.id);
  const status = mapStatus(doc.status, doc.due_date, doc.status?.toLowerCase() === "settled");
  const total = Number(doc.total || 0);
  const subtotal = Number(doc.before_taxes || 0);
  const tax_amount = Number(doc.taxes || 0);
  const discount = Number(doc.discount || 0);
  const { company_id, contact_id } = await resolveClient(admin, workspaceId, doc.client);

  // Check existing
  const { data: existing } = await admin
    .from("invoices")
    .select("id, amount_paid")
    .eq("workspace_id", workspaceId)
    .eq("external_provider", PROVIDER)
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();

  const amount_paid = status === "paid" ? total : (existing?.amount_paid ?? 0);
  const docTypeMap: Record<string, string> = {
    Invoice: "invoice",
    InvoiceReceipt: "invoice_receipt",
    SimplifiedInvoice: "simplified_invoice",
    CreditNote: "credit_note",
  };

  const row: Record<string, any> = {
    workspace_id: workspaceId,
    external_provider: PROVIDER,
    external_id: externalId,
    external_url: doc.permalink || null,
    external_synced_at: new Date().toISOString(),
    invoice_number: doc.sequence_number || doc.inverted_sequence_number || `IX-${doc.id}`,
    document_type: docTypeMap[doc.type] || "invoice",
    status,
    issue_date: doc.date || new Date().toISOString().slice(0, 10),
    due_date: doc.due_date || doc.date || new Date().toISOString().slice(0, 10),
    paid_at: status === "paid" ? (doc.saved_at || new Date().toISOString()) : null,
    subtotal,
    tax_amount,
    total,
    discount_amount: discount,
    amount_paid,
    currency: doc.currency || "EUR",
    notes: doc.observations || null,
    client_name: doc.client?.name || "—",
    client_email: doc.client?.email || null,
    client_address: doc.client?.address || null,
    client_tax_id: doc.client?.fiscal_id || null,
    client_country: doc.client?.country || "PT",
    company_id,
    contact_id,
  };

  if (existing?.id) {
    const { error } = await admin.from("invoices").update(row).eq("id", existing.id);
    if (error) throw error;
    return { mode: "updated" as const };
  } else {
    if (userId) row.created_by = userId;
    else {
      // need created_by NOT NULL: try to find a workspace owner
      const { data: owner } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      row.created_by = owner?.user_id || workspaceId;
    }
    const { error } = await admin.from("invoices").insert(row);
    if (error) throw error;
    return { mode: "imported" as const };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const integrationId: string | undefined = body?.integration_id;
    const since: string = body?.since || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const trigger: string = body?.trigger || "manual";

    if (!integrationId) return json({ ok: false, error: "integration_id obrigatório" }, 200);

    // Auth: cron secret OR JWT admin
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
    let userId: string | null = null;

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 200);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (cErr || !claims?.claims) return json({ ok: false, error: "Unauthorized" }, 200);
      userId = claims.claims.sub as string;
    }

    // Load integration
    const { data: integ, error: iErr } = await admin
      .from("workspace_billing_integrations")
      .select("id, workspace_id, provider, account_name, api_key_encrypted, is_active")
      .eq("id", integrationId)
      .maybeSingle();
    if (iErr || !integ) return json({ ok: false, error: "Integração não encontrada" }, 200);
    if (!integ.is_active) return json({ ok: false, error: "Integração desativada" }, 200);
    if (integ.provider !== PROVIDER) {
      return json({ ok: false, error: `Provider '${integ.provider}' não suportado` }, 200);
    }

    if (!isCron && userId) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
      );
      const { data: isAdmin } = await userClient.rpc("is_workspace_admin", {
        _user_id: userId, _workspace_id: integ.workspace_id,
      });
      const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: userId });
      if (!isAdmin && !isSuper) return json({ ok: false, error: "Sem permissão" }, 200);
    }

    // Open run
    const { data: run } = await admin
      .from("billing_sync_runs")
      .insert({
        workspace_id: integ.workspace_id,
        integration_id: integ.id,
        trigger,
        status: "running",
        cursor_from: new Date(since).toISOString(),
        cursor_to: new Date().toISOString(),
      })
      .select("id")
      .single();
    const runId = run!.id;

    let imported = 0, updated = 0, failed = 0;
    const errors: any[] = [];

    try {
      for (const ixType of SUPPORTED_TYPES) {
        const path = TYPE_TO_PATH[ixType];
        let page = 1;
        // safety cap: 20 pages × 30 = 600 docs por tipo / corrida
        while (page <= 20) {
          const r = await fetchIXPage(integ.account_name, integ.api_key_encrypted, path, since, page);
          if (!r.ok) {
            errors.push({ type: ixType, page, status: r.status, body: (r.raw || "").slice(0, 200) });
            break;
          }
          const list: IXDoc[] = r.data?.[path] || r.data?.invoices || [];
          if (!Array.isArray(list) || list.length === 0) break;

          for (const doc of list) {
            try {
              const res = await upsertInvoice(admin, integ.workspace_id, userId, doc);
              if (res.mode === "imported") imported++;
              else updated++;
            } catch (e: any) {
              failed++;
              errors.push({ type: ixType, doc_id: doc?.id, error: e?.message || String(e) });
            }
          }

          const pagination = r.data?.pagination;
          if (pagination?.total_pages && page >= Number(pagination.total_pages)) break;
          if (list.length < 30) break;
          page++;
        }
      }

      // Update last_check on integration
      await admin
        .from("workspace_billing_integrations")
        .update({
          last_check_at: new Date().toISOString(),
          last_check_status: "ok",
          last_check_error: null,
        })
        .eq("id", integ.id);

      await admin.from("billing_sync_runs").update({
        status: errors.length && imported + updated === 0 ? "error" : "ok",
        finished_at: new Date().toISOString(),
        imported_count: imported,
        updated_count: updated,
        failed_count: failed,
        error_message: errors.length ? errors.slice(0, 3).map((e) => e.error || `HTTP ${e.status}`).join(" | ") : null,
        details: { errors: errors.slice(0, 50) },
      }).eq("id", runId);

      return json({ ok: true, run_id: runId, imported, updated, failed, errors: errors.slice(0, 5) }, 200);
    } catch (loopErr: any) {
      await admin.from("billing_sync_runs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        imported_count: imported,
        updated_count: updated,
        failed_count: failed,
        error_message: loopErr?.message || "loop_error",
        details: { errors: errors.slice(0, 50) },
      }).eq("id", runId);
      await admin.from("workspace_billing_integrations").update({
        last_check_at: new Date().toISOString(),
        last_check_status: "error",
        last_check_error: loopErr?.message || "loop_error",
      }).eq("id", integ.id);
      return json({ ok: false, error: loopErr?.message || "loop_error", run_id: runId }, 200);
    }
  } catch (e: any) {
    console.error("[invoicexpress-sync-invoices] internal_error", e);
    return json({ ok: false, error: e?.message || "internal_error" }, 200);
  }
});
