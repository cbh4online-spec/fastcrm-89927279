import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Step 1: Compute deal probabilities first
    const probRes = await supabase.functions.invoke("compute-deal-probability", {
      body: { workspace_id },
    });

    // Step 2: Get target
    const { data: target } = await supabase
      .from("revenue_targets")
      .select("*")
      .eq("workspace_id", workspace_id)
      .lte("period_start", now.toISOString().split("T")[0])
      .gte("period_end", now.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const targetRevenue = target?.target_revenue ?? 0;

    // Step 3: Get closed won deals this month
    const { data: closedDeals } = await supabase
      .from("opportunities")
      .select("value")
      .eq("workspace_id", workspace_id)
      .eq("status", "won")
      .gte("updated_at", monthStart.toISOString())
      .lte("updated_at", monthEnd.toISOString());

    const closedRevenue = (closedDeals || []).reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    // Step 4: Get probability scores for open deals
    const { data: scores } = await supabase
      .from("deal_probability_scores")
      .select("*, opportunities!inner(value, status, title, company_id)")
      .eq("workspace_id", workspace_id);

    const openScores = (scores || []).filter((s: any) => 
      s.opportunities?.status && !["won", "lost"].includes(s.opportunities.status)
    );

    // Weighted pipeline
    const weightedPipeline = openScores.reduce((sum: number, s: any) => {
      const value = s.opportunities?.value || 0;
      return sum + (value * s.probability_score / 100);
    }, 0);

    // Best case: deals with prob >= 75%
    const bestCaseAddition = openScores
      .filter((s: any) => s.probability_score >= 75)
      .reduce((sum: number, s: any) => sum + (s.opportunities?.value || 0), 0);

    // Worst case: deals with prob >= 40 and risk < 70
    const worstCaseAddition = openScores
      .filter((s: any) => s.probability_score >= 40 && s.risk_score < 70)
      .reduce((sum: number, s: any) => {
        const val = s.opportunities?.value || 0;
        return sum + (val * s.probability_score / 100);
      }, 0);

    const bestCaseRevenue = closedRevenue + bestCaseAddition;
    const mostLikelyRevenue = closedRevenue + weightedPipeline;
    const worstCaseRevenue = closedRevenue + worstCaseAddition;
    const forecastGap = targetRevenue - mostLikelyRevenue;
    const targetHitProbability = targetRevenue > 0
      ? Math.min(1.5, Math.max(0, mostLikelyRevenue / targetRevenue))
      : 0;

    // Forecast confidence
    const avgConfidence = openScores.length > 0
      ? openScores.reduce((sum: number, s: any) => sum + s.confidence_score, 0) / openScores.length
      : 0;
    const forecastConfidence = Math.min(100, avgConfidence * (openScores.length >= 5 ? 1 : 0.7));

    // Save snapshot
    const snapshot = {
      workspace_id,
      period_type: "monthly",
      period_start: monthStart.toISOString().split("T")[0],
      period_end: monthEnd.toISOString().split("T")[0],
      closed_revenue: closedRevenue,
      weighted_pipeline: weightedPipeline,
      best_case_revenue: bestCaseRevenue,
      most_likely_revenue: mostLikelyRevenue,
      worst_case_revenue: worstCaseRevenue,
      target_revenue: targetRevenue,
      forecast_gap: forecastGap,
      target_hit_probability: targetHitProbability,
      forecast_confidence: forecastConfidence,
    };

    const { data: snapshotData } = await supabase
      .from("revenue_forecast_snapshots")
      .insert(snapshot)
      .select()
      .single();

    // Step 5: Compute risk signals
    const riskSignals: any[] = [];

    for (const s of openScores) {
      const opp = s.opportunities;
      const explanation = s.explanation_json || {};
      const daysSinceActivity = explanation.days_since_activity ?? 999;

      // Clear old unresolved signals for this opportunity
      await supabase
        .from("deal_risk_signals")
        .update({ resolved_at: now.toISOString() })
        .eq("workspace_id", workspace_id)
        .eq("opportunity_id", s.opportunity_id)
        .is("resolved_at", null);

      if (daysSinceActivity > 14) {
        riskSignals.push({
          workspace_id, opportunity_id: s.opportunity_id,
          signal_type: "NO_ACTIVITY_14D", severity: "critical",
          signal_score: 90,
          reason: `Sem atividade há ${daysSinceActivity} dias`,
          evidence_json: { days_since_activity: daysSinceActivity },
        });
      } else if (daysSinceActivity > 7) {
        riskSignals.push({
          workspace_id, opportunity_id: s.opportunity_id,
          signal_type: "NO_ACTIVITY_7D", severity: "high",
          signal_score: 70,
          reason: `Sem atividade há ${daysSinceActivity} dias`,
          evidence_json: { days_since_activity: daysSinceActivity },
        });
      }

      if (daysSinceActivity > (explanation.stage_expected_days || 7)) {
        riskSignals.push({
          workspace_id, opportunity_id: s.opportunity_id,
          signal_type: "DEAL_STALLED", severity: "high",
          signal_score: 75,
          reason: "Negócio estagnado na fase atual",
          evidence_json: { days_since_activity: daysSinceActivity, stage: explanation.stage_name },
        });
      }

      if (s.probability_score >= 75 && s.confidence_score < 40) {
        riskSignals.push({
          workspace_id, opportunity_id: s.opportunity_id,
          signal_type: "LOW_CONFIDENCE_FORECAST", severity: "medium",
          signal_score: 50,
          reason: "Probabilidade alta mas confiança baixa nos dados",
          evidence_json: { probability: s.probability_score, confidence: s.confidence_score },
        });
      }

      // Overdependence check
      const oppValue = opp?.value || 0;
      if (mostLikelyRevenue > 0 && oppValue / mostLikelyRevenue > 0.35) {
        riskSignals.push({
          workspace_id, opportunity_id: s.opportunity_id,
          signal_type: "OVERDEPENDENCE_ON_SINGLE_DEAL", severity: "critical",
          signal_score: 85,
          reason: `Este negócio representa ${Math.round(oppValue / mostLikelyRevenue * 100)}% da receita prevista`,
          evidence_json: { deal_value: oppValue, total_forecast: mostLikelyRevenue },
        });
      }
    }

    // Pipeline below target
    if (targetRevenue > 0 && targetHitProbability < 0.7) {
      // Insert as a workspace-level signal on the first open opportunity if any
      if (openScores.length > 0) {
        riskSignals.push({
          workspace_id, opportunity_id: openScores[0].opportunity_id,
          signal_type: "PIPELINE_BELOW_TARGET", severity: "critical",
          signal_score: 95,
          reason: `Pipeline abaixo do target (${Math.round(targetHitProbability * 100)}% do objetivo)`,
          evidence_json: { target: targetRevenue, most_likely: mostLikelyRevenue, gap: forecastGap },
        });
      }
    }

    if (riskSignals.length > 0) {
      await supabase.from("deal_risk_signals").insert(riskSignals);
    }

    // Step 6: Generate recommendations
    const recommendations: any[] = [];

    // Stalled high-value deals
    const stalledHighValue = openScores
      .filter((s: any) => (s.explanation_json?.days_since_activity ?? 0) > 7 && (s.opportunities?.value || 0) > 1000)
      .sort((a: any, b: any) => (b.opportunities?.value || 0) - (a.opportunities?.value || 0))
      .slice(0, 3);

    for (const s of stalledHighValue) {
      recommendations.push({
        workspace_id,
        recommendation_type: "REACTIVATE_DEAL",
        priority: "high",
        title: `Reativar: ${s.opportunities?.title || "Negócio"}`,
        description: `Negócio de €${(s.opportunities?.value || 0).toLocaleString()} estagnado. Follow-up urgente recomendado.`,
        impact_estimate: (s.opportunities?.value || 0) * s.probability_score / 100,
        linked_entity_type: "opportunity",
        linked_entity_id: s.opportunity_id,
        period_type: "monthly",
        period_start: monthStart.toISOString().split("T")[0],
        period_end: monthEnd.toISOString().split("T")[0],
      });
    }

    // High probability deals needing attention
    const highProbDeals = openScores
      .filter((s: any) => s.probability_score >= 70 && s.risk_score > 30)
      .slice(0, 3);

    for (const s of highProbDeals) {
      recommendations.push({
        workspace_id,
        recommendation_type: "FOCUS_HIGH_VALUE_DEAL",
        priority: "high",
        title: `Focar: ${s.opportunities?.title || "Negócio"}`,
        description: `Probabilidade ${s.probability_score}% mas com sinais de risco. Ação preventiva recomendada.`,
        impact_estimate: (s.opportunities?.value || 0) * 0.8,
        linked_entity_type: "opportunity",
        linked_entity_id: s.opportunity_id,
        period_type: "monthly",
      });
    }

    // Forecast gap recommendations
    if (forecastGap > 0) {
      recommendations.push({
        workspace_id,
        recommendation_type: "GENERATE_NEW_PIPELINE",
        priority: "critical",
        title: "Gerar novo pipeline para fechar gap",
        description: `Gap de €${Math.round(forecastGap).toLocaleString()} para atingir o target. Necessário gerar novas oportunidades.`,
        impact_estimate: forecastGap,
        period_type: "monthly",
        period_start: monthStart.toISOString().split("T")[0],
        period_end: monthEnd.toISOString().split("T")[0],
      });
    }

    // Clear old pending recommendations
    await supabase
      .from("revenue_recommendations")
      .update({ status: "archived" })
      .eq("workspace_id", workspace_id)
      .eq("status", "pending");

    if (recommendations.length > 0) {
      await supabase.from("revenue_recommendations").insert(recommendations);
    }

    console.log(`[REVENUE-FLIGHT] Full recompute done: ${openScores.length} deals, ${riskSignals.length} risks, ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        data: {
          snapshot: snapshotData,
          deals_scored: openScores.length,
          risk_signals: riskSignals.length,
          recommendations: recommendations.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[REVENUE-FLIGHT] compute-revenue-flight-control error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
