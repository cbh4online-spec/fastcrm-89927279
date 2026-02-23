import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { suggestionId, recipientEmail, portalUrl } = await req.json();
    if (!suggestionId || !recipientEmail) throw new Error("Missing params");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: suggestion } = await supabase
      .from("client_replenishment_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .single();

    if (!suggestion) throw new Error("Suggestion not found");

    const items = suggestion.suggested_items || [];
    const itemsHtml = items.map((it: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${it.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee">${it.suggested_qty} un.</td><td style="padding:8px;border-bottom:1px solid #eee">${it.unit_price_net?.toFixed(2)}€</td></tr>`
    ).join("");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: "FastCRM <noreply@fastcrm.pt>",
      to: recipientEmail,
      subject: "Sugestão de Reposição — FastCRM",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>Sugestão de Reposição</h2>
          <p>${suggestion.reason || "Com base no seu histórico, recomendamos a reposição dos seguintes produtos:"}</p>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Produto</th><th style="padding:8px">Qtd.</th><th style="padding:8px">Preço</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="margin-top:20px"><a href="${portalUrl || '#'}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Repor Agora</a></p>
          <p style="color:#999;font-size:12px;margin-top:20px">Reposições recomendadas para manutenção do protocolo.</p>
        </div>
      `,
    });

    await supabase
      .from("client_replenishment_suggestions")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", suggestionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
