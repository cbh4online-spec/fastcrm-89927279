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

    const { data: profiles } = await sb
      .from("leadchef_lead_profiles")
      .select("id, lead_id, workspace_id, stage, created_at, next_action_at")
      .not("stage", "in", "(lost,won,client)")
      .order("updated_at", { ascending: true })
      .limit(limit);

    let computed = 0;
    for (const p of profiles ?? []) {
      const ageDays = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400_000);
      let score = 50;
      if (p.stage === "qualified" || p.stage === "hot") score += 20;
      else if (p.stage === "contacted" || p.stage === "warm") score += 10;
      if (ageDays > 30) score -= 15;
      if (ageDays > 60) score -= 15;
      if (p.next_action_at && new Date(p.next_action_at) < new Date()) score -= 10;
      score = Math.max(0, Math.min(100, score));

      await sb.from("leadchef_lead_scores").upsert({
        lead_id: p.lead_id,
        workspace_id: p.workspace_id,
        score,
        is_cold: ageDays > 30 && score < 40,
        breakdown: { age_days: ageDays, stage: p.stage },
        calculated_at: new Date().toISOString(),
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
