import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, project_id } = await req.json();
    if (!workspace_id || !project_id) throw new Error("workspace_id and project_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const [{ data: project }, { data: phases }, { data: tasks }, { data: blockers }] = await Promise.all([
      supabase.from("implementation_projects").select("*").eq("id", project_id).maybeSingle(),
      supabase.from("implementation_project_phases").select("*").eq("project_id", project_id),
      supabase.from("implementation_project_tasks").select("title,status,task_type").eq("project_id", project_id),
      supabase.from("implementation_blockers").select("title,severity,status").eq("project_id", project_id),
    ]);

    const ctx = JSON.stringify({ project, phases, tasks, blockers });

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "És um assistente de Delivery Operations. Em português de Portugal, tom interno e operacional. Não inventar." },
          { role: "user", content: `Gera um resumo de handover para o seguinte projeto:\n\n${ctx}\n\nResponde em JSON com chaves: summary, configured_modules, customer_context, open_risks, support_notes, recommended_next_30_days.` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (ai.status === 429 || ai.status === 402) {
      return new Response(JSON.stringify({ ok: false, fallback: true, error: ai.status === 429 ? "rate_limited" : "credits_exhausted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ai.ok) throw new Error("ai_gateway_error");

    const aiData = await ai.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ ok: true, ...parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, fallback: true, error: e.message ?? "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
