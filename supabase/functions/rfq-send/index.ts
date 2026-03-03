import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildEmailHTML(template: string, data: any): string {
  const { rfq, workspace, portalUrl, supplierName } = data;

  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 600px; margin: 0 auto; padding: 40px 20px;
  `;

  const btnStyle = `
    display: inline-block; padding: 12px 28px; background: #18181b; color: #ffffff;
    text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;
  `;

  const companyName = workspace?.company_name || "FastCRM";
  const rfqTitle = rfq?.title || "Pedido de Cotação";
  const deadline = rfq?.due_date || "—";
  const itemCount = data.itemCount || 0;

  if (template === "rfq_sent") {
    return `<div style="${baseStyle}">
      <h2 style="color:#18181b;margin-bottom:8px;">Pedido de Cotação</h2>
      <p style="color:#71717a;font-size:14px;">De: <strong>${companyName}</strong></p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">
      <p>Estimado(a) ${supplierName || "Fornecedor"},</p>
      <p>Convidamos V. Exa. a apresentar cotação para o seguinte pedido:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#71717a;width:140px;">Referência</td><td style="padding:8px;border-bottom:1px solid #e4e4e7;font-weight:600;">${rfqTitle}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#71717a;">Nº de Itens</td><td style="padding:8px;border-bottom:1px solid #e4e4e7;">${itemCount}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#71717a;">Prazo</td><td style="padding:8px;border-bottom:1px solid #e4e4e7;">${deadline}</td></tr>
        ${rfq?.payment_terms ? `<tr><td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#71717a;">Cond. Pagamento</td><td style="padding:8px;border-bottom:1px solid #e4e4e7;">${rfq.payment_terms}</td></tr>` : ""}
        ${rfq?.currency ? `<tr><td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#71717a;">Moeda</td><td style="padding:8px;border-bottom:1px solid #e4e4e7;">${rfq.currency}</td></tr>` : ""}
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="${portalUrl}" style="${btnStyle}">Responder à Cotação →</a>
      </div>
      <p style="color:#71717a;font-size:12px;">Este link é pessoal e expira em 30 dias. Não partilhe com terceiros.</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">
      <p style="color:#a1a1aa;font-size:11px;">Enviado por ${companyName} via FastCRM</p>
    </div>`;
  }

  if (template === "rfq_reminder") {
    return `<div style="${baseStyle}">
      <h2 style="color:#18181b;">⏰ Lembrete: Cotação Pendente</h2>
      <p>Estimado(a) ${supplierName || "Fornecedor"},</p>
      <p>Recordamos que o prazo para responder ao pedido de cotação <strong>"${rfqTitle}"</strong> termina em <strong>${deadline}</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${portalUrl}" style="${btnStyle}">Responder Agora →</a>
      </div>
      <p style="color:#a1a1aa;font-size:11px;">Enviado por ${companyName} via FastCRM</p>
    </div>`;
  }

  if (template === "rfq_thank_you") {
    return `<div style="${baseStyle}">
      <h2 style="color:#18181b;">✅ Cotação Recebida</h2>
      <p>Estimado(a) ${supplierName || "Fornecedor"},</p>
      <p>Agradecemos o envio da sua proposta para <strong>"${rfqTitle}"</strong>. A sua cotação está em análise.</p>
      <p>Entraremos em contacto após a avaliação das propostas recebidas.</p>
      <p style="color:#a1a1aa;font-size:11px;">Enviado por ${companyName} via FastCRM</p>
    </div>`;
  }

  if (template === "rfq_awarded") {
    return `<div style="${baseStyle}">
      <h2 style="color:#18181b;">🏆 Adjudicação</h2>
      <p>Estimado(a) ${supplierName || "Fornecedor"},</p>
      <p>Temos o prazer de informar que a sua proposta para <strong>"${rfqTitle}"</strong> foi selecionada.</p>
      <p>Será contactado(a) brevemente com os detalhes da ordem de compra.</p>
      <p style="color:#a1a1aa;font-size:11px;">Enviado por ${companyName} via FastCRM</p>
    </div>`;
  }

  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { rfq_id, template } = await req.json();
    if (!rfq_id) {
      return new Response(JSON.stringify({ error: "rfq_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailTemplate = template || "rfq_sent";
    const now = new Date().toISOString();

    // Fetch RFQ
    const { data: rfq } = await supabase.from("rfqs").select("*").eq("id", rfq_id).single();
    if (!rfq) throw new Error("RFQ not found");

    // Fetch workspace
    const { data: ws } = await supabase.from("workspaces").select("company_name, tax_id, billing_address").eq("id", rfq.workspace_id).single();

    // Fetch suppliers
    const { data: rfqSuppliers } = await supabase
      .from("rfq_suppliers")
      .select("*, suppliers:supplier_id(name, email)")
      .eq("rfq_id", rfq_id);

    // Count items
    const { count: itemCount } = await supabase
      .from("rfq_items")
      .select("id", { count: "exact", head: true })
      .eq("rfq_id", rfq_id);

    // Get app URL for portal links
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";

    // Generate portal tokens and prepare emails
    for (const rs of (rfqSuppliers || [])) {
      // Generate portal token if not exists
      let portalToken = rs.portal_token;
      if (!portalToken) {
        portalToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await supabase.from("rfq_suppliers").update({
          portal_token: portalToken,
          portal_token_expires_at: expiresAt.toISOString(),
        } as any).eq("id", rs.id);
      }

      const portalUrl = `${appUrl}/supplier-portal/${portalToken}`;

      // Build email
      const html = buildEmailHTML(emailTemplate, {
        rfq,
        workspace: ws,
        portalUrl,
        supplierName: rs.suppliers?.name,
        itemCount: itemCount || 0,
      });

      // Log the email (actual sending would use Resend or similar)
      console.log(`Email template "${emailTemplate}" prepared for ${rs.suppliers?.email}: portal=${portalUrl}`);
    }

    // Update statuses for initial send
    if (emailTemplate === "rfq_sent") {
      await supabase
        .from("rfq_suppliers")
        .update({ sent_at: now, status: "invited" } as any)
        .eq("rfq_id", rfq_id);

      await supabase
        .from("rfqs")
        .update({ status: "sent", updated_at: now } as any)
        .eq("id", rfq_id);

      // Update related needs
      const { data: rfqItems } = await supabase
        .from("rfq_items")
        .select("need_id")
        .eq("rfq_id", rfq_id)
        .not("need_id", "is", null);

      const needIds = (rfqItems || []).map((i: any) => i.need_id).filter(Boolean);
      if (needIds.length) {
        await supabase
          .from("procurement_needs")
          .update({ status: "rfq_in_progress" } as any)
          .in("id", needIds);
      }
    }

    return new Response(JSON.stringify({ success: true, suppliers_notified: (rfqSuppliers || []).length, template: emailTemplate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-send error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
