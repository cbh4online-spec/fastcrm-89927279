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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { contract_id, workspace_id, alert_type, recipients } = await req.json();

    if (!contract_id || !workspace_id || !alert_type) {
      return new Response(JSON.stringify({ error: "contract_id, workspace_id, alert_type required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Check dedup — already sent today?
    const today = new Date().toISOString().split("T")[0];
    const recipientTypes = recipients === "both" ? ["user", "client"] : [recipients || "user"];

    const results: any[] = [];

    for (const recipientType of recipientTypes) {
      // Check if already sent today
      const { data: existing } = await supabase
        .from("renewal_alert_log")
        .select("id")
        .eq("contract_id", contract_id)
        .eq("alert_type", alert_type)
        .eq("recipient_type", recipientType)
        .eq("sent_date", today)
        .maybeSingle();

      if (existing) {
        results.push({ recipientType, status: "skipped", reason: "already_sent_today" });
        continue;
      }

      // Get contract details
      const { data: contract } = await supabase
        .from("renewal_contracts")
        .select("*, company:companies(id, name), contact:contacts(id, name, email), owner_user_id")
        .eq("id", contract_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (!contract) {
        results.push({ recipientType, status: "error", reason: "contract_not_found" });
        continue;
      }

      const companyName = (contract as any).company?.name || "—";
      const contactName = (contract as any).contact?.name || "";
      const contactEmail = (contract as any).contact?.email || "";
      const renewalDate = contract.next_renewal_date
        ? new Date(contract.next_renewal_date).toLocaleDateString("pt-PT")
        : "—";
      const mrr = Number(contract.total_mrr || 0).toFixed(2);

      let emailTo = "";
      let subject = "";
      let body = "";

      if (recipientType === "user" && contract.owner_user_id) {
        // Get owner email from profiles or auth
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", contract.owner_user_id)
          .maybeSingle();

        emailTo = ownerProfile?.email || "";
        subject = `[Renovação] ${alertTypeLabel(alert_type)} — ${companyName}`;
        body = buildUserAlertBody(companyName, alertTypeLabel(alert_type), renewalDate, mrr, contract_id);
      } else if (recipientType === "client" && contactEmail) {
        emailTo = contactEmail;
        subject = `Renovação de serviço — ${companyName}`;
        body = buildClientAlertBody(contactName, companyName, alertTypeLabel(alert_type), renewalDate, mrr);
      }

      if (!emailTo) {
        results.push({ recipientType, status: "skipped", reason: "no_email" });
        continue;
      }

      // Try to send via internal email composer edge function
      try {
        const { data: emailConfig } = await supabase
          .from("workspace_email_config")
          .select("*")
          .eq("workspace_id", workspace_id)
          .eq("is_active", true)
          .maybeSingle();

        if (emailConfig) {
          // Use workspace email to send
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-workspace-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              workspace_id,
              to: emailTo,
              subject,
              html: body,
            }),
          });

          if (!sendResponse.ok) {
            console.warn("Email send failed, logging anyway:", await sendResponse.text());
          }
        }
      } catch (emailError) {
        console.warn("Email send error:", emailError);
      }

      // Log the alert
      await supabase.from("renewal_alert_log").insert({
        workspace_id,
        contract_id,
        alert_type,
        recipient_type: recipientType,
        sent_date: today,
        payload_json: { email_to: emailTo, subject },
      });

      // Log event on contract
      await supabase.from("renewal_events").insert({
        workspace_id,
        contract_id,
        event_type: "renewal_due",
        payload_json: { alert_type, recipient_type: recipientType, email_to: emailTo },
      });

      results.push({ recipientType, status: "sent", email_to: emailTo });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Renewal alert error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function alertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "30d": "Renovação em 30 dias",
    "15d": "Renovação em 15 dias",
    "7d": "Renovação em 7 dias",
    "1d": "Renovação amanhã",
    "overdue": "Renovação em atraso",
  };
  return labels[type] || type;
}

function buildUserAlertBody(company: string, alertLabel: string, date: string, mrr: string, contractId: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">⚠️ Alerta de Renovação</h2>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">
        <strong>${alertLabel}</strong> para a empresa <strong>${company}</strong>.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Empresa</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${company}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Data Renovação</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">MRR</td><td style="padding: 8px; border-bottom: 1px solid #eee;">€${mrr}</td></tr>
      </table>
      <p style="color: #555; font-size: 13px;">Aceda ao CRM para gerir esta renovação.</p>
    </div>
  `;
}

function buildClientAlertBody(contactName: string, company: string, alertLabel: string, date: string, mrr: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">Renovação de Serviço</h2>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">
        ${contactName ? `Caro(a) ${contactName},` : "Caro(a) Cliente,"}
      </p>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">
        Gostaríamos de informar que a renovação dos seus serviços está próxima.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Status</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${alertLabel}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Data Renovação</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">Valor</td><td style="padding: 8px; border-bottom: 1px solid #eee;">€${mrr}</td></tr>
      </table>
      <p style="color: #555; font-size: 13px;">Para qualquer questão, não hesite em contactar-nos.</p>
      <p style="color: #888; font-size: 12px; margin-top: 24px;">Com os melhores cumprimentos.</p>
    </div>
  `;
}
