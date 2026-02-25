import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  hot: 0.9,
  likely: 0.7,
  uncertain: 0.4,
  low: 0.15,
};

function daysDiff(dateStr: string | null, fromDate: Date): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return (d.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
}

async function computeForecastForWorkspace(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
) {
  const now = new Date();

  // Fetch opportunities, deal_scores, AND health cache in parallel
  const [oppsResult, scoresResult, healthResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, value, expected_close_date, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "open"),
    supabase
      .from("deal_scores")
      .select("opportunity_id, close_score, category")
      .eq("workspace_id", workspace_id),
    supabase
      .from("deal_intelligence_cache")
      .select("deal_id, payload")
      .eq("workspace_id", workspace_id),
  ]);

  if (oppsResult.error) throw oppsResult.error;
  if (scoresResult.error) throw scoresResult.error;

  const opportunities = oppsResult.data || [];
  const scores = scoresResult.data || [];
  const healthData = healthResult.data || [];

  // Build lookup maps
  const scoreMap = new Map<string, { close_score: number; category: string }>();
  scores.forEach((s) => scoreMap.set(s.opportunity_id, s));

  const healthMap = new Map<string, { health_score: number; health_label: string; data_completeness: number }>();
  healthData.forEach((h: any) => {
    try {
      const p = typeof h.payload === "string" ? JSON.parse(h.payload) : h.payload;
      healthMap.set(h.deal_id, {
        health_score: p.health_score ?? 50,
        health_label: p.health_label ?? "WATCH",
        data_completeness: p.data_completeness?.percent ?? 50,
      });
    } catch { /* skip malformed */ }
  });

  let forecast_7 = 0;
  let forecast_30 = 0;
  let forecast_90 = 0;
  let best_case = 0;
  let expected_case = 0;
  let worst_case = 0;
  let health_adjusted_total = 0;
  let total_confidence = 0;
  let scored_count = 0;
  let hot_count = 0;
  let likely_count = 0;
  let uncertain_count = 0;
  let low_count = 0;

  // Health tracking
  let total_health = 0;
  let health_count = 0;
  let total_completeness = 0;
  let healthy_count = 0;
  let watch_count = 0;
  let at_risk_count = 0;

  for (const opp of opportunities) {
    const value = Number(opp.value) || 0;
    const score = scoreMap.get(opp.id);
    const health = healthMap.get(opp.id);

    // Track health metrics
    if (health) {
      total_health += health.health_score;
      total_completeness += health.data_completeness;
      health_count++;
      if (health.health_label === "HEALTHY") healthy_count++;
      else if (health.health_label === "WATCH") watch_count++;
      else at_risk_count++;
    }

    let close_probability: number;
    let category: string;
    let weighted_revenue: number;

    if (score) {
      close_probability = score.close_score / 100;
      category = score.category;
      const weight = CONFIDENCE_WEIGHTS[category] ?? 0.4;
      weighted_revenue = value * close_probability * weight;

      switch (category) {
        case "hot": hot_count++; break;
        case "likely": likely_count++; break;
        case "uncertain": uncertain_count++; break;
        default: low_count++;
      }

      total_confidence += score.close_score;
      scored_count++;
    } else {
      close_probability = 0.3;
      category = "uncertain";
      weighted_revenue = value * 0.3 * 0.4;
      uncertain_count++;
    }

    const expected_revenue = value * close_probability;

    // Health-adjusted revenue
    const health_weight = health ? health.health_score / 100 : 0.5;
    health_adjusted_total += value * close_probability * health_weight;

    // Scenario totals
    if (category === "hot") best_case += value;
    expected_case += expected_revenue;
    worst_case += weighted_revenue;

    // Horizon bucketing
    const daysUntilClose = daysDiff(opp.expected_close_date, now);

    if (daysUntilClose <= 7) {
      forecast_7 += weighted_revenue;
      forecast_30 += weighted_revenue;
      forecast_90 += weighted_revenue;
    } else if (daysUntilClose <= 30) {
      forecast_30 += weighted_revenue;
      forecast_90 += weighted_revenue;
    } else if (daysUntilClose <= 90 || opp.expected_close_date === null) {
      forecast_90 += weighted_revenue;
    } else {
      forecast_90 += weighted_revenue;
    }
  }

  const risk_index = best_case > 0 ? Math.min(1, 1 - worst_case / best_case) : 1.0;
  const confidence_avg = scored_count > 0 ? total_confidence / scored_count : 0;
  const pipeline_health_avg = health_count > 0 ? Math.round(total_health / health_count * 10) / 10 : 0;

  // Forecast confidence: "Is my forecast realistic?" (0-100)
  const data_completeness_score = health_count > 0 ? total_completeness / health_count / 100 : 0;
  const scoring_coverage = opportunities.length > 0 ? scored_count / opportunities.length : 0;
  const health_distribution_score = health_count > 0
    ? (healthy_count * 1.0 + watch_count * 0.6 + at_risk_count * 0.2) / health_count
    : 0;
  const forecast_confidence = Math.round(
    (data_completeness_score * 0.4 + scoring_coverage * 0.3 + health_distribution_score * 0.3) * 100
  );

  const { data: inserted, error: insertError } = await supabase
    .from("revenue_forecasts")
    .insert({
      workspace_id,
      forecast_7: Math.round(forecast_7 * 100) / 100,
      forecast_30: Math.round(forecast_30 * 100) / 100,
      forecast_90: Math.round(forecast_90 * 100) / 100,
      best_case: Math.round(best_case * 100) / 100,
      expected_case: Math.round(expected_case * 100) / 100,
      worst_case: Math.round(worst_case * 100) / 100,
      risk_index: Math.round(risk_index * 1000) / 1000,
      confidence_avg: Math.round(confidence_avg * 10) / 10,
      opportunity_count: opportunities.length,
      hot_count,
      likely_count,
      uncertain_count,
      low_count,
      health_adjusted_expected: Math.round(health_adjusted_total * 100) / 100,
      pipeline_health_avg,
      forecast_confidence,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { workspace_id?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    // Cron mode: iterate all workspaces that have deal_scores
    if (!body.workspace_id) {
      const { data: workspaces, error } = await supabase
        .from("deal_scores")
        .select("workspace_id")
        .limit(1000);

      if (error) throw error;

      const uniqueWorkspaceIds = [...new Set((workspaces || []).map((r: any) => r.workspace_id))];
      const results = await Promise.allSettled(
        uniqueWorkspaceIds.map((wid) => computeForecastForWorkspace(supabase, wid))
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return new Response(
        JSON.stringify({ success: true, processed: succeeded, failed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Single workspace mode
    const result = await computeForecastForWorkspace(supabase, body.workspace_id);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("compute-revenue-forecast error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
