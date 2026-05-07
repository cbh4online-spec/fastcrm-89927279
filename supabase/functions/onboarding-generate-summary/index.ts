// Gera resumo IA de projeto de onboarding (admin only)
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

    const { onboarding_project_id } = await req.json();
    if (!onboarding_project_id) {
      return new Response(JSON.stringify({ error: "missing_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: project } = await sb.from("customer_onboarding_projects")
      .select("*").eq("id", onboarding_project_id).maybeSingle();
    if (!project) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: items } = await sb.from("customer_onboarding_checklist_items")
      .select("title, status, response_value, required").eq("onboarding_project_id", onboarding_project_id);
    const { data: docs } = await sb.from("customer_onboarding_documents")
      .select("title, status").eq("onboarding_project_id", onboarding_project_id);
    const { data: blockers } = await sb.from("onboarding_blockers")
      .select("title, blocker_type, status").eq("onboarding_project_id", onboarding_project_id).eq("status", "open");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ summary: "AI gateway não configurado", missing_information: [], risks: [], recommended_next_actions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Analisa este projeto de onboarding e gera um resumo executivo em português de Portugal. Usa APENAS os dados fornecidos, não inventes informação.

Projeto: ${project.title}
Cliente: ${project.customer_company_name ?? "—"}
Estado: ${project.status}
Módulos: ${JSON.stringify(project.selected_modules)}

Checklist (${items?.length ?? 0} itens):
${items?.map(i => `- [${i.status}] ${i.title}${i.response_value ? `: ${i.response_value.slice(0, 100)}` : ""}`).join("\n")}

Documentos: ${docs?.map(d => `${d.title} (${d.status})`).join(", ") ?? "nenhum"}
Bloqueios abertos: ${blockers?.map(b => b.title).join(", ") ?? "nenhum"}

Devolve JSON: { "summary", "missing_information": [], "risks": [], "recommended_next_actions": [], "customer_message_suggestion" }`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("onboarding-generate-summary error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true, summary: "Erro ao gerar resumo." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
