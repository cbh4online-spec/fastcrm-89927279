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
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [oppsResult, scoresResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, value, expected_close_date, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "open"),

    supabase
      .from("deal_scores")
      .select("opportunity_id, close_score, category")
      .eq("workspace_id", workspace_id),
  ]);

  if (oppsResult.error) throw oppsResult.error;
  if (scoresResult.error) throw scoresResult.error;

  const opportunities = oppsResult.data || [];
  const scores = scoresResult.data || [];

  // Build score lookup map
  const scoreMap = new Map<string, { close_score: number; category: string }>();
  scores.forEach((s) => scoreMap.set(s.opportunity_id, s));

  let forecast_7 = 0;
  let forecast_30 = 0;
  let forecast_90 = 0;
  let best_case = 0;
  let expected_case = 0;
  let worst_case = 0;
  let total_confidence = 0;
  let scored_count = 0;
  let hot_count = 0;
  let likely_count = 0;
  let uncertain_count = 0;
  let low_count = 0;

  for (const opp of opportunities) {
    const value = Number(opp.value) || 0;
    const score = scoreMap.get(opp.id);

    let close_probability: number;
    let category: string;
    let weighted_revenue: number;

    if (score) {
      close_probability = score.close_score / 100;
      category = score.category;
      const weight = CONFIDENCE_WEIGHTS[category] ?? 0.4;
      weighted_revenue = value * close_probability * weight;

      // Count distribution
      switch (category) {
        case "hot": hot_count++; break;
        case "likely": likely_count++; break;
        case "uncertain": uncertain_count++; break;
        default: low_count++;
      }

      total_confidence += score.close_score;
      scored_count++;
    } else {
      // Fallback for unscored opportunities
      close_probability = 0.3;
      category = "uncertain";
      weighted_revenue = value * 0.3 * 0.4;
      uncertain_count++;
    }

    const expected_revenue = value * close_probability;

    // Scenario totals (all opps)
    if (category === "hot") best_case += value;
    expected_case += expected_revenue;
    worst_case += weighted_revenue;

    // Horizon bucketing by expected_close_date
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
      // Beyond 90 days — still add to 90d as conservative catch-all
      forecast_90 += weighted_revenue;
    }
  }

  const risk_index = best_case > 0 ? Math.min(1, 1 - worst_case / best_case) : 1.0;
  const confidence_avg = scored_count > 0 ? total_confidence / scored_count : 0;

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
