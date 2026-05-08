// LeadChef daily recompute — recomputes scores for active leads
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit ?? 500);

    const { data: leads } = await sb
      .from("leadchef_leads")
      .select("id, workspace_id, stage, created_at, next_action_due_at")
      .neq("stage", "lost")
      .neq("stage", "won")
      .order("updated_at", { ascending: true })
      .limit(limit);

    let computed = 0;
    for (const lead of leads ?? []) {
      const ageDays = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400_000);
      let score = 50;
      if (lead.stage === "qualified") score += 20;
      else if (lead.stage === "contacted") score += 10;
      if (ageDays > 30) score -= 15;
      if (ageDays > 60) score -= 15;
      if (lead.next_action_due_at && new Date(lead.next_action_due_at) < new Date()) score -= 10;
      score = Math.max(0, Math.min(100, score));

      await sb.from("leadchef_lead_scores").upsert({
        lead_id: lead.id,
        workspace_id: lead.workspace_id,
        score,
        is_cold: ageDays > 30 && score < 40,
        computed_at: new Date().toISOString(),
      }, { onConflict: "lead_id" });
      computed++;
    }

    return new Response(JSON.stringify({ ok: true, computed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[leadchef-daily-recompute]", e);
    return new Response(JSON.stringify({ ok: false, fallback: true, error: String((e as Error).message) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
