import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildReminderHTML(data: {
  supplierName: string;
  rfqTitle: string;
  deadline: string;
  portalUrl: string;
  companyName: string;
}): string {
  const { supplierName, rfqTitle, deadline, portalUrl, companyName } = data;

  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 600px; margin: 0 auto; padding: 40px 20px;
  `;
  const btnStyle = `
    display: inline-block; padding: 12px 28px; background: #18181b; color: #ffffff;
    text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;
  `;

  return `<div style="${baseStyle}">
    <h2 style="color:#18181b;">⏰ Lembrete: Cotação Pendente</h2>
    <p>Estimado(a) ${supplierName},</p>
    <p>Recordamos que o prazo para responder ao pedido de cotação <strong>"${rfqTitle}"</strong> termina em <strong>${deadline}</strong>.</p>
    <p style="color:#dc2626;font-weight:600;">Faltam menos de 48 horas para o prazo expirar.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${portalUrl}" style="${btnStyle}">Responder Agora →</a>
    </div>
    <p style="color:#a1a1aa;font-size:11px;">Enviado por ${companyName} via FastCRM</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Fetch RFQs with deadline within 48h
    const { data: rfqs, error: rfqError } = await supabase
      .from("rfqs")
      .select("id, title, due_date, workspace_id, status")
      .in("status", ["sent", "receiving_quotes"])
      .gte("due_date", now.toISOString())
      .lte("due_date", in48h.toISOString());

    if (rfqError) throw rfqError;
    if (!rfqs || rfqs.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0, message: "No RFQs approaching deadline" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
    let totalSent = 0;

    for (const rfq of rfqs) {
      // Fetch suppliers that haven't received a reminder yet
      const { data: rfqSuppliers } = await supabase
        .from("rfq_suppliers")
        .select("id, portal_token, supplier_id, suppliers:supplier_id(name, email)")
        .eq("rfq_id", rfq.id)
        .is("reminder_sent_at", null)
        .not("portal_token", "is", null);

      if (!rfqSuppliers || rfqSuppliers.length === 0) continue;

      // Fetch workspace info
      const { data: ws } = await supabase
        .from("workspaces")
        .select("company_name")
        .eq("id", rfq.workspace_id)
        .single();

      const companyName = ws?.company_name || "FastCRM";

      for (const rs of rfqSuppliers) {
        const supplier = rs.suppliers as any;
        if (!supplier?.email) continue;

        const portalUrl = `${appUrl}/supplier-portal/${rs.portal_token}`;
        const html = buildReminderHTML({
          supplierName: supplier.name || "Fornecedor",
          rfqTitle: rfq.title || "Pedido de Cotação",
          deadline: rfq.due_date || "—",
          portalUrl,
          companyName,
        });

        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${companyName} <noreply@fastcrm.lovable.app>`,
            to: [supplier.email],
            subject: `⏰ Lembrete: Cotação "${rfq.title}" expira em breve`,
            html,
          }),
        });

        if (emailRes.ok) {
          // Mark reminder as sent
          await supabase
            .from("rfq_suppliers")
            .update({ reminder_sent_at: now.toISOString() } as any)
            .eq("id", rs.id);

          totalSent++;
        } else {
          const errBody = await emailRes.text();
          console.error(`Failed to send reminder to ${supplier.email}:`, errBody);
        }
      }

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        workspace_id: rfq.workspace_id,
        type: "rfq_deadline_reminder",
        title: `Lembretes enviados: ${rfq.title}`,
        message: `Foram enviados lembretes de deadline (48h) aos fornecedores do RFQ "${rfq.title}".`,
        metadata: { rfq_id: rfq.id, suppliers_notified: rfqSuppliers.length },
      });
    }

    console.log(`rfq-deadline-reminder: ${totalSent} reminders sent for ${rfqs.length} RFQs`);

    return new Response(JSON.stringify({ success: true, reminders_sent: totalSent, rfqs_checked: rfqs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-deadline-reminder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
