// Gera QBR draft com IA
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

    const { customer_account_id, period_start, period_end } = await req.json();
    if (!customer_account_id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account } = await sb.from("customer_accounts").select("*").eq("id", customer_account_id).maybeSingle();
    if (!account) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: snap } = await sb.from("customer_health_score_snapshots")
      .select("*").eq("customer_account_id", customer_account_id)
      .order("created_at", { ascending: false }).limit(1);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ps = period_start ?? new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const pe = period_end ?? new Date().toISOString().slice(0, 10);

    let qbr: any = {
      executive_summary: `Revisão trimestral de ${account.name}. Health score atual: ${account.health_score ?? "n/d"}/100.`,
      usage_summary: {}, value_delivered: [], support_summary: {}, revenue_summary: {},
      risks: [], opportunities: [], recommended_actions: [], next_period_goals: [],
    };

    if (LOVABLE_API_KEY) {
      const prompt = `Gera um QBR (Quarterly Business Review) para este cliente. Português de Portugal. Não inventes números.

Cliente: ${account.name} | MRR: €${account.mrr} | Health: ${account.health_score}/100
Período: ${ps} a ${pe}
Snapshot mais recente: ${JSON.stringify(snap?.[0] ?? {})}

Devolve JSON: { "executive_summary", "usage_summary": {}, "value_delivered": [], "support_summary": {}, "revenue_summary": {}, "risks": [], "opportunities": [], "recommended_actions": [], "next_period_goals": [] }`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        try { qbr = { ...qbr, ...JSON.parse(j.choices?.[0]?.message?.content ?? "{}") }; } catch { /* keep fallback */ }
      }
    }

    const { data: inserted } = await sb.from("customer_qbr_reviews").insert({
      customer_account_id, workspace_id: account.workspace_id,
      period_start: ps, period_end: pe, status: "draft",
      executive_summary: qbr.executive_summary,
      usage_summary: qbr.usage_summary, value_delivered: qbr.value_delivered,
      support_summary: qbr.support_summary, revenue_summary: qbr.revenue_summary,
      risks: qbr.risks, opportunities: qbr.opportunities,
      recommended_actions: qbr.recommended_actions, next_period_goals: qbr.next_period_goals,
    }).select().single();

    return new Response(JSON.stringify(inserted ?? qbr), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("cs-qbr error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
