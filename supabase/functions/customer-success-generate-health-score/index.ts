// Calcula health score do cliente e cria snapshot
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function statusFromScore(s: number): string {
  if (s >= 85) return "excellent";
  if (s >= 70) return "healthy";
  if (s >= 50) return "neutral";
  if (s >= 30) return "at_risk";
  return "critical";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { customer_account_id } = await req.json();
    if (!customer_account_id) {
      return new Response(JSON.stringify({ error: "missing_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: account } = await sb.from("customer_accounts").select("*").eq("id", customer_account_id).maybeSingle();
    if (!account) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Heuristic component scores (placeholders + signals)
    const { data: openRisks } = await sb.from("customer_churn_risks").select("severity").eq("customer_account_id", customer_account_id).eq("status", "open");
    const { data: opps } = await sb.from("customer_expansion_opportunities").select("id").eq("customer_account_id", customer_account_id).neq("status", "dismissed");

    const base = Number(account.health_score ?? 60);
    const adoption = Math.max(0, Math.min(100, base + (Math.random() * 10 - 5)));
    const usage = Math.max(0, Math.min(100, base + (Math.random() * 10 - 5)));
    const support = Math.max(0, Math.min(100, base - (openRisks?.filter(r => r.severity === "critical").length ?? 0) * 15));
    const value = Math.max(0, Math.min(100, base + (opps?.length ?? 0) * 2));
    const engagement = Math.max(0, Math.min(100, base));
    const satisfaction = Math.max(0, Math.min(100, base));
    const financial = Math.max(0, Math.min(100, base));

    const overall = Math.round((adoption + usage + support + value + engagement + satisfaction + financial) / 7);
    const health_status = statusFromScore(overall);

    const recommended_actions = [];
    if (health_status === "at_risk" || health_status === "critical") {
      recommended_actions.push({ action: "schedule_urgent_checkin" }, { action: "review_risks" });
    }
    if ((opps?.length ?? 0) > 0) recommended_actions.push({ action: "review_expansion_opportunities" });

    await sb.from("customer_health_score_snapshots").insert({
      customer_account_id, workspace_id: account.workspace_id,
      overall_score: overall, health_status,
      adoption_score: adoption, usage_score: usage, support_score: support,
      value_score: value, engagement_score: engagement, satisfaction_score: satisfaction, financial_score: financial,
      recommended_actions, calculated_by: "system",
    });

    await sb.from("customer_accounts").update({
      health_score: overall, health_status, updated_at: new Date().toISOString(),
    }).eq("id", customer_account_id);

    return new Response(JSON.stringify({
      overall_score: overall, health_status,
      component_scores: { adoption, usage, support, value, engagement, satisfaction, financial },
      recommended_actions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("cs-health-score error", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
