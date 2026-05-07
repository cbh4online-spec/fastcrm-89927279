// Gera resumo IA de Customer Success / retention recommendations
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { customer_account_id, mode = "summary" } = await req.json();
    if (!customer_account_id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account } = await sb.from("customer_accounts").select("*").eq("id", customer_account_id).maybeSingle();
    if (!account) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: risks } = await sb.from("customer_churn_risks").select("title, severity, description").eq("customer_account_id", customer_account_id).eq("status", "open");
    const { data: opps } = await sb.from("customer_expansion_opportunities").select("title, opportunity_type, estimated_mrr_increase").eq("customer_account_id", customer_account_id).neq("status", "dismissed");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ summary: "AI gateway não configurado", recommended_actions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Analisa esta conta de Customer Success e ${mode === "retention" ? "gera estratégia de retenção" : "gera resumo executivo"}. Português de Portugal, tom executivo. Não inventes números.

Cliente: ${account.name}
Plano MRR: €${account.mrr ?? "—"}
Health: ${account.health_score ?? "—"}/100 (${account.health_status})
Lifecycle: ${account.lifecycle_stage}
Go-live: ${account.go_live_date ?? "—"}
Renovação: ${account.renewal_date ?? "—"}

Riscos abertos (${risks?.length ?? 0}): ${risks?.map(r => `[${r.severity}] ${r.title}`).join("; ") ?? "nenhum"}
Oportunidades (${opps?.length ?? 0}): ${opps?.map(o => `${o.title} (+€${o.estimated_mrr_increase ?? 0}/mês)`).join("; ") ?? "nenhuma"}

Devolve JSON: { "summary", "health_explanation", "risks": [], "expansion_opportunities": [], "recommended_actions": [], "customer_message_suggestion", "internal_note", "confidence" }`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429 || r.status === 402) {
      return new Response(JSON.stringify({ error: r.status === 429 ? "rate_limited" : "payment_required", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("cs-summary error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true, summary: "Erro ao gerar resumo." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
