// supabase/functions/send-account-statement/index.ts
// Envia extrato de conta de um caso de cobrança por email.
// - Valida JWT + pertença ao workspace.
// - Reconstrói os dados de extrato server-side (não confia no cliente).
// - Invoca send-transactional-email com o template 'account-statement'.
// - Regista a ação em collection_actions.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmtEur(n: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(n);
  } catch {
    return `€${n.toFixed(2)}`;
  }
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ---- Auth ----
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await supaUser.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  // ---- Input ----
  let body: {
    caseId?: string;
    recipientEmail?: string;
    customMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const caseId = (body.caseId ?? "").trim();
  const recipientEmail = (body.recipientEmail ?? "").trim();
  const customMessage = (body.customMessage ?? "").trim().slice(0, 2000);

  if (!caseId || !recipientEmail) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Service client for DB reads ----
  const supa = createClient(supabaseUrl, serviceKey);

  // Load case
  const { data: caseRow, error: caseErr } = await supa
    .from("collection_cases")
    .select(
      "id, workspace_id, company_id, contact_id, debtor_name, debtor_email",
    )
    .eq("id", caseId)
    .maybeSingle();
  if (caseErr || !caseRow) {
    return new Response(JSON.stringify({ error: "case_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authorize: user must belong to workspace
  const { data: member } = await supa
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", caseRow.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch invoices for debtor
  const filterCol = caseRow.company_id ? "company_id" : caseRow.contact_id ? "contact_id" : null;
  const filterId = caseRow.company_id ?? caseRow.contact_id ?? null;
  if (!filterCol || !filterId) {
    return new Response(JSON.stringify({ error: "debtor_not_linked" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: invs, error: invErr } = await supa
    .from("invoices")
    .select("id, invoice_number, document_type, issue_date, due_date, total, amount_paid, status, currency")
    .eq("workspace_id", caseRow.workspace_id)
    .eq(filterCol, filterId)
    .neq("status", "cancelled")
    .order("issue_date", { ascending: true });
  if (invErr) {
    console.error("invoices fetch error", invErr);
    return new Response(JSON.stringify({ error: "fetch_invoices_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const invoices = (invs ?? []).map((i) => ({
    ...i,
    total: Number(i.total),
    amount_paid: Number(i.amount_paid ?? 0),
  }));

  let payments: Array<{
    id: string; invoice_id: string; payment_date: string; amount: number;
    payment_method: string | null; reference: string | null;
  }> = [];
  if (invoices.length > 0) {
    const ids = invoices.map((i) => i.id);
    const { data: pays } = await supa
      .from("invoice_payments")
      .select("id, invoice_id, amount, payment_date, payment_method, reference")
      .in("invoice_id", ids)
      .order("payment_date", { ascending: true });
    payments = (pays ?? []).map((p) => ({
      id: p.id,
      invoice_id: p.invoice_id,
      payment_date: p.payment_date,
      amount: Number(p.amount),
      payment_method: p.payment_method ?? null,
      reference: p.reference ?? null,
    }));
  }

  const currency = invoices[0]?.currency || "EUR";
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amount_paid, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  // Build chronological lines (invoice = débito; pagamento = crédito)
  const numToInv = new Map(invoices.map((i) => [i.id, i.invoice_number]));
  type Line = { type: "invoice" | "payment"; date: string; ref: string; description: string; debit?: string; credit?: string };
  const lines: Line[] = [
    ...invoices.map<Line>((i) => ({
      type: "invoice",
      date: fmtDate(i.issue_date),
      ref: `${i.document_type ?? "FT"} ${i.invoice_number}`,
      description: `Vencimento ${fmtDate(i.due_date)}`,
      debit: fmtEur(i.total, currency),
    })),
    ...payments.map<Line>((p) => ({
      type: "payment",
      date: fmtDate(p.payment_date),
      ref: `Pagamento ${numToInv.get(p.invoice_id) ?? ""}`.trim(),
      description: [p.payment_method, p.reference].filter(Boolean).join(" · "),
      credit: fmtEur(p.amount, currency),
    })),
  ].sort((a, b) => {
    // dates are dd/mm/yyyy strings — sort by reversed string
    const toIso = (s: string) => {
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    };
    return toIso(a.date).localeCompare(toIso(b.date));
  });

  // ---- Invoke send-transactional-email ----
  const supaService = createClient(supabaseUrl, serviceKey);
  const idempotencyKey = `acct-statement-${caseId}-${Date.now()}`;

  const { data: sendRes, error: sendErr } = await supaService.functions.invoke(
    "send-transactional-email",
    {
      body: {
        templateName: "account-statement",
        recipientEmail,
        idempotencyKey,
        templateData: {
          customerName: caseRow.debtor_name,
          customMessage,
          totalInvoiced: fmtEur(totalInvoiced, currency),
          totalPaid: fmtEur(totalPaid, currency),
          totalOutstanding: fmtEur(totalOutstanding, currency),
          generatedAt: new Date().toLocaleDateString("pt-PT"),
          lines,
        },
      },
    },
  );

  if (sendErr) {
    console.error("send-transactional-email failed", sendErr);
    return new Response(JSON.stringify({ error: "send_failed", detail: String(sendErr.message ?? sendErr) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Register action in case timeline ----
  await supa.from("collection_actions").insert({
    workspace_id: caseRow.workspace_id,
    case_id: caseId,
    action_type: "email_sent",
    channel: "email",
    subject: `Extrato de conta · saldo ${fmtEur(totalOutstanding, currency)}`,
    body: customMessage || "Extrato de conta enviado por email.",
    outcome: "sent",
    performed_by: userId,
    is_automated: false,
    metadata: {
      kind: "account_statement",
      recipient_email: recipientEmail,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      invoices_count: invoices.length,
      payments_count: payments.length,
      idempotency_key: idempotencyKey,
    },
  });

  await supa
    .from("collection_cases")
    .update({ last_action_at: new Date().toISOString() })
    .eq("id", caseId);

  return new Response(
    JSON.stringify({
      success: true,
      summary: {
        invoices: invoices.length,
        payments: payments.length,
        totalOutstanding,
        currency,
      },
      sendResult: sendRes ?? null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
