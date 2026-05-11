// Adjudica oportunidade: cria fatura local (+InvoiceXpress se ativo) e envia por WhatsApp.
// Input: { opportunityId, proposalId? }
// Devolve sempre 200 com { ok, ... } para evitar crashes no cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Payload {
  opportunityId: string;
  proposalId?: string;
  forceWhatsApp?: boolean;
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function fmtMoney(v: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 200);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ ok: false, error: "Unauthorized" }, 200);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Payload;
    if (!body?.opportunityId) return json({ ok: false, error: "opportunityId obrigatório" }, 200);

    // 1. Carregar oportunidade + verificar permissão
    const { data: opp, error: oppErr } = await admin
      .from("opportunities")
      .select("id, workspace_id, title, value, currency, contact_id, company_id, lead_id, status")
      .eq("id", body.opportunityId)
      .maybeSingle();
    if (oppErr || !opp) return json({ ok: false, error: "Oportunidade não encontrada" }, 200);

    const { data: isMember } = await userClient.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: opp.workspace_id,
    });
    if (!isMember) return json({ ok: false, error: "Sem permissão" }, 200);

    // 2. Carregar proposta (mais recente accepted/published) ou a indicada
    let proposalQuery = admin
      .from("proposals")
      .select("id, title, price, currency, contact_id, company_id, billing_address, billing_nif")
      .eq("opportunity_id", opp.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (body.proposalId) proposalQuery = proposalQuery.eq("id", body.proposalId);

    const { data: proposal } = await proposalQuery.maybeSingle();

    // 3. Carregar items (proposta) ou criar item simples a partir do valor da oportunidade
    let lineItems: Array<{ description: string; quantity: number; unit_price: number; product_id: string | null }> = [];
    if (proposal) {
      const { data: items } = await admin
        .from("proposal_items")
        .select("name, quantity, unit_price, product_id")
        .eq("proposal_id", proposal.id)
        .eq("is_enabled", true)
        .order("position", { ascending: true });
      if (items && items.length > 0) {
        lineItems = items.map((i) => ({
          description: i.name,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          product_id: i.product_id,
        }));
      }
    }
    if (lineItems.length === 0) {
      lineItems = [{
        description: opp.title,
        quantity: 1,
        unit_price: Number(opp.value || 0),
        product_id: null,
      }];
    }

    // 4. Resolver dados do cliente
    const contactId = proposal?.contact_id || opp.contact_id;
    const companyId = proposal?.company_id || opp.company_id;

    let clientName = "Cliente";
    let clientEmail: string | null = null;
    let clientTaxId: string | null = proposal?.billing_nif ?? null;
    let clientAddress: string | null = proposal?.billing_address ?? null;
    let clientPhone: string | null = null;

    if (companyId) {
      const { data: c } = await admin
        .from("companies")
        .select("name, email, tax_id, address, phone")
        .eq("id", companyId).maybeSingle();
      if (c) {
        clientName = c.name || clientName;
        clientEmail = clientEmail || c.email;
        clientTaxId = clientTaxId || c.tax_id;
        clientAddress = clientAddress || c.address;
        clientPhone = clientPhone || c.phone;
      }
    }
    if (contactId) {
      const { data: c } = await admin
        .from("contacts")
        .select("name, email, tax_id, address, phone, whatsapp_number, has_whatsapp")
        .eq("id", contactId).maybeSingle();
      if (c) {
        clientName = c.name || clientName;
        clientEmail = clientEmail || c.email;
        clientTaxId = clientTaxId || c.tax_id;
        clientAddress = clientAddress || c.address;
        clientPhone = c.whatsapp_number || c.phone || clientPhone;
      }
    }

    // 5. Calcular totais
    const TAX = 23;
    const subtotal = lineItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    const tax_amount = +(subtotal * TAX / 100).toFixed(2);
    const total = +(subtotal + tax_amount).toFixed(2);
    const currency = (proposal?.currency || opp.currency || "EUR").toUpperCase();

    // 6. Próximo número
    const year = new Date().getFullYear();
    const { count } = await admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", opp.workspace_id)
      .gte("issue_date", `${year}-01-01`);
    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(5, "0")}`;

    // 7. Inserir invoice
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .insert({
        workspace_id: opp.workspace_id,
        invoice_number: invoiceNumber,
        status: "issued",
        opportunity_id: opp.id,
        proposal_id: proposal?.id ?? null,
        contact_id: contactId,
        company_id: companyId,
        client_name: clientName,
        client_email: clientEmail,
        client_address: clientAddress,
        client_tax_id: clientTaxId,
        subtotal,
        tax_rate: TAX,
        tax_amount,
        total,
        currency,
        sent_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("id, invoice_number")
      .maybeSingle();
    if (invErr || !invoice) return json({ ok: false, error: invErr?.message || "Falha ao criar fatura" }, 200);

    await admin.from("invoice_items").insert(
      lineItems.map((i, idx) => ({
        invoice_id: invoice.id,
        product_id: i.product_id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: TAX,
        total: +(i.quantity * i.unit_price * (1 + TAX / 100)).toFixed(2),
        tax_amount: +(i.quantity * i.unit_price * TAX / 100).toFixed(2),
        net_total: +(i.quantity * i.unit_price).toFixed(2),
        gross_total: +(i.quantity * i.unit_price * (1 + TAX / 100)).toFixed(2),
        position: idx,
      })),
    );

    // 8. Marcar oportunidade como Won (se não estiver)
    if (opp.status !== "won") {
      await admin.from("opportunities").update({ status: "won", updated_at: new Date().toISOString() }).eq("id", opp.id);
    }

    // 9. Carregar settings de automação
    const { data: settings } = await admin
      .from("pipeline_automation_settings")
      .select("*")
      .eq("workspace_id", opp.workspace_id)
      .maybeSingle();

    const attachPdf = settings?.attach_pdf_whatsapp ?? true;
    const tplWA = settings?.whatsapp_template
      || "Olá {{cliente}}, segue a fatura nº {{numero}} no valor de {{total}}. Pode aceder aqui: {{link}}. Obrigado!";

    let publicUrl: string | null = null;
    let pdfUrl: string | null = null;
    let externalId: string | null = null;
    let ixWarning: string | null = null;

    // 10. Sincronizar com InvoiceXpress (best-effort)
    const { data: integ } = await admin
      .from("workspace_billing_integrations")
      .select("id")
      .eq("workspace_id", opp.workspace_id)
      .eq("provider", "invoicexpress")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integ?.id) {
      try {
        const proxyRes = await fetch(`${supabaseUrl}/functions/v1/invoicexpress-proxy`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            integration_id: integ.id,
            method: "POST",
            path: "/invoices.json",
            body: {
              invoice: {
                date: new Date().toISOString().slice(0, 10),
                due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                client: {
                  name: clientName,
                  email: clientEmail || undefined,
                  address: clientAddress || undefined,
                  fiscal_id: clientTaxId || undefined,
                },
                items: lineItems.map((i) => ({
                  name: i.description.slice(0, 80),
                  description: i.description,
                  unit_price: i.unit_price,
                  quantity: i.quantity,
                  tax: { name: "IVA23" },
                })),
              },
            },
          }),
        });
        const proxyJson = await proxyRes.json();
        if (proxyJson?.ok && proxyJson?.data?.invoice) {
          externalId = String(proxyJson.data.invoice.id);
          publicUrl = proxyJson.data.invoice.permalink || proxyJson.data.invoice.url || null;
          pdfUrl = proxyJson.data.invoice.pdf_url || null;
          await admin.from("invoices").update({
            external_id: externalId,
            external_provider: "invoicexpress",
            public_url: publicUrl,
            pdf_url: pdfUrl,
          }).eq("id", invoice.id);
        } else {
          ixWarning = proxyJson?.error || `InvoiceXpress: status ${proxyJson?.status ?? "?"}`;
        }
      } catch (e) {
        ixWarning = `InvoiceXpress falhou: ${(e as Error).message}`;
      }
    }

    // 11. Enviar WhatsApp
    let waStatus: "sent" | "skipped" | "failed" = "skipped";
    let waError: string | null = null;
    const phone = clientPhone?.replace(/\D/g, "");
    if (phone && phone.length >= 9) {
      try {
        const link = publicUrl || `${supabaseUrl.replace("/v1", "")}`;
        const message = renderTemplate(tplWA, {
          cliente: clientName,
          numero: invoice.invoice_number,
          total: fmtMoney(total, currency),
          link: link,
          titulo: opp.title,
        });
        const waRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-pro-send`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: opp.workspace_id,
            contactId,
            phone,
            messageType: attachPdf && pdfUrl ? "document" : "text",
            text: message,
            mediaUrl: attachPdf && pdfUrl ? pdfUrl : undefined,
            mediaMimeType: attachPdf && pdfUrl ? "application/pdf" : undefined,
            fileName: attachPdf && pdfUrl ? `${invoice.invoice_number}.pdf` : undefined,
            metadata: { invoice_id: invoice.id, opportunity_id: opp.id, source: "adjudicate" },
          }),
        });
        const waJson = await waRes.json();
        if (waJson?.ok || waJson?.success) waStatus = "sent";
        else { waStatus = "failed"; waError = waJson?.error || "envio falhou"; }
      } catch (e) {
        waStatus = "failed";
        waError = (e as Error).message;
      }
    } else {
      waError = "Sem telefone WhatsApp no contacto";
    }

    return json({
      ok: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      total,
      currency,
      publicUrl,
      pdfUrl,
      whatsapp: { status: waStatus, error: waError },
      invoicexpress: { synced: !!externalId, warning: ixWarning },
    });
  } catch (e) {
    console.error("opportunity-adjudicate error", e);
    return json({ ok: false, error: "internal_error", message: (e as Error).message }, 200);
  }
});
