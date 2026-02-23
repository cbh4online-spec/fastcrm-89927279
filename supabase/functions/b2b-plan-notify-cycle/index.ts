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
    const { planId, type, recipientEmail } = await req.json();
    if (!planId || !type || !recipientEmail) throw new Error("Missing params");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: plan } = await supabase
      .from("b2b_subscription_plans")
      .select("name, cadence, next_run_at")
      .eq("id", planId)
      .single();

    if (!plan) throw new Error("Plan not found");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(resendKey);

    let subject = "";
    let body = "";

    if (type === "upcoming") {
      subject = `Próximo ciclo: ${plan.name}`;
      body = `<p>O próximo ciclo do seu plano <strong>${plan.name}</strong> será executado em breve.</p><p>Data prevista: ${plan.next_run_at ? new Date(plan.next_run_at).toLocaleDateString("pt-PT") : "Em breve"}</p>`;
    } else if (type === "executed") {
      subject = `Ciclo executado: ${plan.name}`;
      body = `<p>O ciclo do seu plano <strong>${plan.name}</strong> foi executado com sucesso.</p>`;
    }

    await resend.emails.send({
      from: "FastCRM <noreply@fastcrm.pt>",
      to: recipientEmail,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>Plano de Manutenção</h2>${body}<p style="color:#999;font-size:12px">Pode gerir os seus planos no Portal Cliente.</p></div>`,
    });

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
