// Push a FastCRM invoice to InvoiceXpress as a DRAFT document.
// Supports: invoice, invoice_receipt, simplified_invoice, credit_note.
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

type DocType = "invoice" | "invoice_receipt" | "simplified_invoice" | "credit_note";
const TYPE_PATH: Record<DocType, string> = {
  invoice: "invoices",
  invoice_receipt: "invoice_receipts",
  simplified_invoice: "simplified_invoices",
  credit_note: "credit_notes",
};
const TYPE_ROOT: Record<DocType, string> = {
  invoice: "invoice",
  invoice_receipt: "invoice_receipt",
  simplified_invoice: "simplified_invoice",
  credit_note: "credit_note",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString("pt-PT").replace(/\//g, "/");
  // IX expects DD/MM/YYYY
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return new Date().toLocaleDateString("pt-PT");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return json({ ok: false, error: "Unauthorized" }, 200);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims)
      return json({ ok: false, error: "Unauthorized" }, 200);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as {
      invoice_id?: string;
      document_type?: DocType;
      integration_id?: string;
    };
    if (!body?.invoice_id || !body?.document_type) {
      return json(
        { ok: false, error: "invoice_id e document_type são obrigatórios" },
        200,
      );
    }
    if (!TYPE_PATH[body.document_type]) {
      return json({ ok: false, error: "document_type inválido" }, 200);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load invoice + items
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("*")
      .eq("id", body.invoice_id)
      .maybeSingle();
    if (invErr || !invoice)
      return json({ ok: false, error: "Fatura não encontrada" }, 200);

    // Auth: user must belong to workspace
    const { data: isMember } = await userClient.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: invoice.workspace_id,
    });
    const { data: isSuper } = await userClient.rpc("is_super_admin", {
      _user_id: userId,
    });
    if (!isMember && !isSuper)
      return json({ ok: false, error: "Sem permissão" }, 200);

    // Pick integration: explicit, default, or first active
    let integQ = admin
      .from("workspace_billing_integrations")
      .select("id, provider, account_name, api_key_encrypted, is_active, is_default")
      .eq("workspace_id", invoice.workspace_id)
      .eq("provider", PROVIDER)
      .eq("is_active", true);
    if (body.integration_id) integQ = integQ.eq("id", body.integration_id);
    const { data: integrations, error: intErr } = await integQ
      .order("is_default", { ascending: false })
      .limit(1);
    if (intErr || !integrations || !integrations[0]) {
      return json(
        { ok: false, error: "Sem integração InvoiceXpress ativa neste workspace" },
        200,
      );
    }
    const integ = integrations[0];

    const account = normalizeAccount(integ.account_name);
    if (!account)
      return json({ ok: false, error: "Conta InvoiceXpress inválida" }, 200);

    const { data: items } = await admin
      .from("invoice_items")
      .select("description, quantity, unit_price, discount_percent, tax_rate, vat_exemption_reason")
      .eq("invoice_id", invoice.id)
      .order("position", { ascending: true });

    if (!items || items.length === 0) {
      return json({ ok: false, error: "Fatura sem linhas para enviar" }, 200);
    }

    // Build IX payload
    const docType = body.document_type;
    const docRoot = TYPE_ROOT[docType];
    const docPath = TYPE_PATH[docType];

    const clientPayload: Record<string, unknown> = {
      name: invoice.client_name || "Cliente",
    };
    if (invoice.client_tax_id) clientPayload.fiscal_id = invoice.client_tax_id;
    if (invoice.client_email) clientPayload.email = invoice.client_email;
    if (invoice.client_address) clientPayload.address = invoice.client_address;
    if (invoice.client_country) clientPayload.country = invoice.client_country;

    const ixItems = items.map((it: any) => {
      const li: Record<string, unknown> = {
        name: (it.description || "Artigo").slice(0, 100),
        description: (it.description || "").slice(0, 250),
        unit_price: Number(it.unit_price ?? 0),
        quantity: Number(it.quantity ?? 1),
        discount: Number(it.discount_percent ?? 0),
        tax: { name: `IVA${Number(it.tax_rate ?? 0)}`, value: Number(it.tax_rate ?? 0) },
      };
      if (Number(it.tax_rate ?? 0) === 0 && it.vat_exemption_reason) {
        li.tax_exemption = it.vat_exemption_reason;
      }
      return li;
    });

    const docPayload: Record<string, unknown> = {
      date: fmtDate(invoice.issue_date),
      due_date: fmtDate(invoice.due_date || invoice.issue_date),
      reference: invoice.invoice_number || undefined,
      observations: invoice.notes || undefined,
      client: clientPayload,
      items: ixItems,
    };
    if (invoice.currency && invoice.currency !== "EUR") {
      docPayload.currency_code = invoice.currency;
    }

    const url = `https://${encodeURIComponent(account)}.app.invoicexpress.com/${docPath}.json?api_key=${encodeURIComponent(integ.api_key_encrypted)}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    let r: Response;
    try {
      r = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [docRoot]: docPayload }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const txt = await r.text();
    let data: any = null;
    try { data = JSON.parse(txt); } catch { data = txt; }

    if (r.status < 200 || r.status >= 300) {
      console.error("[invoicexpress-push-document] upstream_error", r.status, data);
      const msg =
        (data && (data.errors?.[0]?.message || data.error || data.message)) ||
        `InvoiceXpress respondeu ${r.status}`;
      return json({ ok: false, status: r.status, error: msg, details: data }, 200);
    }

    const created = data?.[docRoot] || data;
    const externalId = String(created?.id ?? "");
    const permalink = created?.permalink || null;
    const sequence = created?.sequence_number || created?.inverted_sequence_number || null;

    // Update FastCRM invoice with external refs
    if (externalId) {
      await admin
        .from("invoices")
        .update({
          external_provider: PROVIDER,
          external_id: externalId,
          external_url: permalink,
          external_synced_at: new Date().toISOString(),
          external_document_type: docType,
          external_state: created?.status || "draft",
          external_sequence_number: sequence,
          external_state_synced_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
    }

    return json({
      ok: true,
      external_id: externalId,
      external_url: permalink,
      sequence_number: sequence,
      document_type: docType,
    });
  } catch (e) {
    console.error("[invoicexpress-push-document] internal_error", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "internal_error" },
      200,
    );
  }
});
