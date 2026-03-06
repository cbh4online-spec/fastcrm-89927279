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

const RISK_MULTIPLIERS: Record<string, number> = {
  HEALTHY: 1.0,
  WATCH: 0.9,
  AT_RISK: 0.7,
};

function daysDiff(dateStr: string | null, fromDate: Date): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return (d.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
  return `€${Math.round(v)}`;
}

async function emitKernelEvent(
  supabase: ReturnType<typeof createClient>,
  params: { workspace_id: string; type: string; entity_kind: string; entity_id: string; payload?: Record<string, unknown> }
) {
  try {
    await supabase.from("kernel_events").insert({
      workspace_id: params.workspace_id,
      type: params.type,
      entity_kind: params.entity_kind,
      entity_id: params.entity_id,
      source_module: "ai-analytics",
      actor_type: "system",
      payload: params.payload ?? {},
      occurred_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      schema_version: 1,
    });
  } catch (e) {
    console.warn("[AI-ANALYTICS] Failed to emit kernel event:", (e as Error).message);
  }
}

async function computeForecastForWorkspace(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
) {
  const now = new Date();

  // Fetch opportunities, deal_scores, health cache, AND pipeline stages in parallel
  const [oppsResult, scoresResult, healthResult, stagesResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, value, expected_close_date, status, stage_id")
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
    supabase
      .from("pipeline_stages")
      .select("id, probability, expected_days")
      .eq("workspace_id", workspace_id),
  ]);

  if (oppsResult.error) throw oppsResult.error;
  if (scoresResult.error) throw scoresResult.error;

  const opportunities = oppsResult.data || [];
  const scores = scoresResult.data || [];
  const healthData = healthResult.data || [];
  const stages = stagesResult.data || [];

  // Build lookup maps
  const scoreMap = new Map<string, { close_score: number; category: string }>();
  scores.forEach((s) => scoreMap.set(s.opportunity_id, s));

  const stageMap = new Map<string, { probability: number | null; expected_days: number | null }>();
  stages.forEach((s: any) => stageMap.set(s.id, { probability: s.probability, expected_days: s.expected_days }));

  const healthMap = new Map<string, { health_score: number; health_label: string; data_completeness: number; last_activity_days: number; has_next_step: boolean }>();
  healthData.forEach((h: any) => {
    try {
      const p = typeof h.payload === "string" ? JSON.parse(h.payload) : h.payload;
      healthMap.set(h.deal_id, {
        health_score: p.health_score ?? 50,
        health_label: p.health_label ?? "WATCH",
        data_completeness: p.data_completeness?.percent ?? 50,
        last_activity_days: p.debug?.last_activity_days ?? 999,
        has_next_step: p.debug?.has_next_step ?? false,
      });
    } catch { /* skip malformed */ }
  });

  let forecast_7 = 0;
  let forecast_30 = 0;
  let forecast_90 = 0;
  let best_case = 0;
  let expected_case = 0;
  let worst_case = 0;
  let stage_weighted_total = 0;
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
  let healthy_revenue = 0;
  let watch_revenue = 0;
  let at_risk_revenue = 0;

  // Blocker tracking
  let deals_no_activity = 0;
  let deals_missing_close_date = 0;
  let deals_no_next_step = 0;
  let total_value = 0;
  let high_value_no_activity = 0;

  for (const opp of opportunities) {
    const value = Number(opp.value) || 0;
    total_value += value;
    const score = scoreMap.get(opp.id);
    const health = healthMap.get(opp.id);
    const stage = opp.stage_id ? stageMap.get(opp.stage_id) : null;

    // Stage probability (fallback 0.5)
    const stageProbability = stage?.probability ?? 0.5;

    // Health label risk multiplier
    const healthLabel = health?.health_label ?? "WATCH";
    const riskMultiplier = RISK_MULTIPLIERS[healthLabel] ?? 0.9;

    // Track health metrics
    if (health) {
      total_health += health.health_score;
      total_completeness += health.data_completeness;
      health_count++;
      if (healthLabel === "HEALTHY") { healthy_count++; healthy_revenue += value; }
      else if (healthLabel === "WATCH") { watch_count++; watch_revenue += value; }
      else { at_risk_count++; at_risk_revenue += value; }

      if (health.last_activity_days > 10) deals_no_activity++;
      if (!health.has_next_step) deals_no_next_step++;
    } else {
      watch_count++;
      watch_revenue += value;
    }

    if (!opp.expected_close_date) deals_missing_close_date++;

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

    // Stage-weighted: value × stage_probability
    stage_weighted_total += value * stageProbability;

    // Health-adjusted (V2): value × stage_probability × risk_multiplier
    health_adjusted_total += value * stageProbability * riskMultiplier;

    // High-value no activity tracking
    if (health && health.last_activity_days > 10 && value > 0) {
      high_value_no_activity++;
    }

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
    } else {
      forecast_90 += weighted_revenue;
    }
  }

  const risk_index = best_case > 0 ? Math.min(1, 1 - worst_case / best_case) : 1.0;
  const confidence_avg = scored_count > 0 ? total_confidence / scored_count : 0;
  const pipeline_health_avg = health_count > 0 ? Math.round(total_health / health_count * 10) / 10 : 0;

  // Confidence Score V2 (spec formula)
  const totalDeals = opportunities.length || 1;
  const at_risk_ratio = at_risk_count / totalDeals;
  const no_activity_ratio = deals_no_activity / totalDeals;
  const missing_data_ratio = (deals_missing_close_date) / totalDeals;
  const forecast_confidence = Math.round(
    Math.max(0, Math.min(1, 1 - (at_risk_ratio * 0.4 + no_activity_ratio * 0.3 + missing_data_ratio * 0.3))) * 100
  );

  // Generate blockers (max 5)
  const blockers: string[] = [];
  if (high_value_no_activity > 0) {
    blockers.push(`${high_value_no_activity} deal${high_value_no_activity !== 1 ? "s" : ""} without activity for 10+ days`);
  }
  // Check stage bottlenecks from health data
  const stageBottlenecks: string[] = [];
  for (const [, stageData] of stageMap) {
    if (stageData.expected_days && stageData.expected_days > 0) {
      // We check this at aggregate level via intelligence panel, skip per-stage here
    }
  }
  if (deals_missing_close_date > 0) {
    blockers.push(`${deals_missing_close_date} deal${deals_missing_close_date !== 1 ? "s" : ""} missing close date`);
  }
  if (at_risk_count > 0) {
    blockers.push(`${at_risk_count} deal${at_risk_count !== 1 ? "s" : ""} at risk`);
  }
  if (deals_no_next_step > 0) {
    blockers.push(`${deals_no_next_step} deal${deals_no_next_step !== 1 ? "s" : ""} without next step`);
  }
  if (forecast_confidence < 50) {
    blockers.push("Low data quality reducing forecast confidence");
  }

  const r = (v: number) => Math.round(v * 100) / 100;

  const { data: inserted, error: insertError } = await supabase
    .from("revenue_forecasts")
    .insert({
      workspace_id,
      forecast_7: r(forecast_7),
      forecast_30: r(forecast_30),
      forecast_90: r(forecast_90),
      best_case: r(best_case),
      expected_case: r(expected_case),
      worst_case: r(worst_case),
      risk_index: Math.round(risk_index * 1000) / 1000,
      confidence_avg: Math.round(confidence_avg * 10) / 10,
      opportunity_count: opportunities.length,
      hot_count,
      likely_count,
      uncertain_count,
      low_count,
      health_adjusted_expected: r(health_adjusted_total),
      pipeline_health_avg,
      forecast_confidence,
      stage_weighted: r(stage_weighted_total),
      healthy_revenue: r(healthy_revenue),
      watch_revenue: r(watch_revenue),
      at_risk_revenue: r(at_risk_revenue),
      blockers,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Emit FORECAST.UPDATED kernel event
  await emitKernelEvent(supabase, {
    workspace_id,
    type: "FORECAST.UPDATED",
    entity_kind: "revenue_forecast",
    entity_id: inserted.id,
    payload: {
      expected_case: r(expected_case),
      forecast_confidence,
      opportunity_count: opportunities.length,
      risk_index: Math.round(risk_index * 1000) / 1000,
    },
  });

  // Emit RISK.SIGNAL_DETECTED if high risk
  if (risk_index > 0.5 || at_risk_count > 0) {
    await emitKernelEvent(supabase, {
      workspace_id,
      type: "RISK.SIGNAL_DETECTED",
      entity_kind: "revenue_forecast",
      entity_id: inserted.id,
      payload: {
        risk_index: Math.round(risk_index * 1000) / 1000,
        at_risk_count,
        blockers,
      },
    });
  }

  console.log(`[AI-ANALYTICS] FORECAST_COMPUTED workspace=${workspace_id} opportunity_count=${opportunities.length} scored_count=${scored_count} health_count=${health_count} forecast_confidence=${forecast_confidence} expected_case=${r(expected_case)}`);

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

      console.log(`[AI-ANALYTICS] FORECAST_CRON_COMPLETE processed=${succeeded} failed=${failed} workspaces=${uniqueWorkspaceIds.length}`);

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
    console.error("[AI-ANALYTICS] COMPUTE_FORECAST_FAILED", err.message || err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});