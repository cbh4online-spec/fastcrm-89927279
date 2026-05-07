import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, project_id } = await req.json();
    if (!workspace_id || !project_id) throw new Error("missing params");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const [{ data: project }, { data: tasks }, { data: blockers }] = await Promise.all([
      supabase.from("implementation_projects").select("*").eq("id", project_id).maybeSingle(),
      supabase.from("implementation_project_tasks").select("title,status,due_at,required").eq("project_id", project_id),
      supabase.from("implementation_blockers").select("title,severity,status").eq("project_id", project_id).neq("status","resolved"),
    ]);

    // Heurística simples
    const overdue = (tasks ?? []).filter(t => t.due_at && new Date(t.due_at) < new Date() && t.status !== "completed").length;
    const criticalBlockers = (blockers ?? []).filter(b => b.severity === "critical").length;
    const overBudget = project?.estimated_hours && project?.used_hours > project.estimated_hours;
    let health: string = "on_track";
    if (criticalBlockers > 0) health = "critical";
    else if (overdue > 2 || overBudget) health = "at_risk";
    else if ((blockers ?? []).length > 0) health = "blocked";

    let aiSummary: any = null;
    if (LOVABLE_API_KEY) {
      const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Analista sénior de Delivery. PT-PT, conciso, prático." },
            { role: "user", content: `Projeto: ${JSON.stringify({ project, blockers, overdue, criticalBlockers })}\n\nResponde JSON com: risks (array), recommended_actions (array), go_live_risk (string), confidence (0-1).` },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (ai.ok) {
        const d = await ai.json();
        try { aiSummary = JSON.parse(d?.choices?.[0]?.message?.content ?? "{}"); } catch {}
      }
    }

    await supabase.from("implementation_projects").update({ health_status: health }).eq("id", project_id);

    return new Response(JSON.stringify({
      ok: true, health_status: health, overdue_tasks: overdue, critical_blockers: criticalBlockers,
      over_budget: !!overBudget, ...aiSummary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, fallback: true, error: e.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
