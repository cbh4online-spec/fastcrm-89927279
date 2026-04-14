import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { contract_id, workspace_id } = await req.json();
    if (!contract_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "contract_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await db.from("workspace_members")
      .select("id").eq("workspace_id", workspace_id).eq("user_id", userId).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load contract
    const { data: contract, error: contractErr } = await db.from("renewal_contracts")
      .select("id, workspace_id, company_id, contact_id, total_mrr, currency, owner_user_id, renewal_interval, next_renewal_date")
      .eq("id", contract_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (contractErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load items
    const { data: items } = await db.from("renewal_items")
      .select("name, qty, unit_price, product_id")
      .eq("contract_id", contract_id)
      .in("status", ["active", "pending_renewal"]);

    // Calculate total from items or fallback to MRR
    const itemsTotal = (items || []).reduce((sum: number, i: any) => sum + ((i.qty || 1) * (Number(i.unit_price) || 0)), 0);
    const invoiceTotal = itemsTotal > 0 ? itemsTotal : Number(contract.total_mrr || 0);

    // Generate invoice number
    const now = new Date().toISOString();
    const dateStr = now.split("T")[0].replace(/-/g, "");
    const { count } = await db.from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .like("invoice_number", `REN-${dateStr}%`);
    const seq = (count || 0) + 1;
    const invoiceNumber = `REN-${dateStr}-${String(seq).padStart(3, "0")}`;

    // Get company/contact names
    let clientName = "—";
    let clientEmail = "";
    if (contract.company_id) {
      const { data: company } = await db.from("companies")
        .select("name").eq("id", contract.company_id).maybeSingle();
      if (company) clientName = company.name;
    }
    if (contract.contact_id) {
      const { data: contact } = await db.from("contacts")
        .select("email").eq("id", contract.contact_id).maybeSingle();
      if (contact) clientEmail = contact.email || "";
    }

    // Insert invoice
    const { data: newInvoice, error: invoiceErr } = await db.from("invoices").insert({
      workspace_id,
      invoice_number: invoiceNumber,
      document_type: "invoice",
      client_name: clientName,
      client_email: clientEmail || null,
      company_id: contract.company_id,
      contact_id: contract.contact_id,
      renewal_contract_id: contract_id,
      created_by: userId,
      status: "paid",
      paid_at: now,
      issue_date: now.split("T")[0],
      due_date: now.split("T")[0],
      subtotal: invoiceTotal,
      tax_amount: 0,
      total: invoiceTotal,
      amount_paid: invoiceTotal,
      currency: contract.currency || "EUR",
      notes: `Renovação confirmada manualmente por utilizador.`,
    }).select("id").maybeSingle();

    if (invoiceErr) {
      console.error("[GENERATE-RENEWAL-INVOICE] Invoice insert failed:", JSON.stringify(invoiceErr));
      return new Response(JSON.stringify({ error: "Failed to create invoice", detail: invoiceErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert invoice items
    if (newInvoice && items && items.length > 0) {
      const invoiceItems = items.map((item: any, idx: number) => ({
        invoice_id: newInvoice.id,
        description: item.name,
        quantity: item.qty || 1,
        unit_price: Number(item.unit_price) || 0,
        total: (item.qty || 1) * (Number(item.unit_price) || 0),
        product_id: item.product_id,
        position: idx + 1,
      }));
      await db.from("invoice_items").insert(invoiceItems);
    }

    // Advance next_renewal_date
    const intervalMonths: Record<string, number> = {
      monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
    };
    const months = intervalMonths[contract.renewal_interval] || 12;
    const nextDate = contract.next_renewal_date ? new Date(contract.next_renewal_date) : new Date();
    nextDate.setMonth(nextDate.getMonth() + months);

    await db.from("renewal_contracts").update({
      status: "active",
      next_renewal_date: nextDate.toISOString().split("T")[0],
    }).eq("id", contract_id);

    // Create renewal event
    await db.from("renewal_events").insert({
      workspace_id,
      contract_id,
      event_type: "renewed",
      payload_json: { invoice_id: newInvoice?.id, invoice_number: invoiceNumber, confirmed_by: userId },
    });

    // Create notification for owner
    const notifyUserId = contract.owner_user_id || userId;
    await db.from("notifications").insert({
      workspace_id,
      user_id: notifyUserId,
      type: "renewal",
      title: `Renovação confirmada: ${clientName}`,
      message: `Fatura ${invoiceNumber} criada — ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: contract.currency || "EUR" }).format(invoiceTotal)}`,
      link: `/dashboard/invoices`,
    });

    // Emit kernel event
    try {
      await fetch(`${supabaseUrl}/functions/v1/kernel-ingest-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          workspace_id,
          type: "B2B.RENEWAL_INVOICE_CREATED",
          entity_kind: "invoice",
          entity_id: newInvoice?.id || contract_id,
          actor_type: "user",
          actor_id: userId,
          source_module: "renewals",
          schema_version: 1,
          occurred_at: now,
          payload: {
            contract_id,
            invoice_number: invoiceNumber,
            total: invoiceTotal,
            currency: contract.currency || "EUR",
            client_name: clientName,
          },
        }),
      });
    } catch (kernelErr) {
      console.warn("[GENERATE-RENEWAL-INVOICE] Kernel event failed:", kernelErr);
    }

    console.log(`[GENERATE-RENEWAL-INVOICE] Invoice ${invoiceNumber} created for contract ${contract_id}`);

    return new Response(JSON.stringify({
      success: true,
      invoice_id: newInvoice?.id,
      invoice_number: invoiceNumber,
      total: invoiceTotal,
      next_renewal_date: nextDate.toISOString().split("T")[0],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[GENERATE-RENEWAL-INVOICE] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
