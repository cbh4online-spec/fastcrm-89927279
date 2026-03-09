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

    // Get model config
    const { data: config } = await supabase
      .from("revenue_model_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    const stalledDays = config?.stalled_threshold_days ?? 7;

    // Get all open opportunities with stage info
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("*, pipeline_stages!inner(name, probability, position, expected_days)")
      .eq("workspace_id", workspace_id)
      .in("status", ["open", "active", "in_progress"])
      .order("value", { ascending: false });

    if (!opportunities?.length) {
      return new Response(JSON.stringify({ data: [], count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const results: any[] = [];

    for (const opp of opportunities) {
      const stage = (opp as any).pipeline_stages;
      const stageProbability = stage?.probability ?? 50;
      const expectedDays = stage?.expected_days ?? 14;

      // --- DETERMINISTIC SCORING ---
      let probabilityScore = stageProbability;
      let riskScore = 0;
      let healthScore = 100;
      let momentumScore = 50;
      let confidenceScore = 50;

      const reasons: string[] = [];
      const riskReasons: string[] = [];

      // Activity recency
      const lastActivity = opp.last_activity_at ? new Date(opp.last_activity_at) : null;
      const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / 86400000) : 999;

      if (daysSinceActivity <= 2) {
        probabilityScore += 5;
        momentumScore += 20;
        reasons.push("Atividade recente (últimos 2 dias)");
      } else if (daysSinceActivity <= 5) {
        momentumScore += 10;
      } else if (daysSinceActivity > stalledDays) {
        probabilityScore -= 15;
        riskScore += 25;
        momentumScore -= 30;
        riskReasons.push(`Sem atividade há ${daysSinceActivity} dias`);
      } else if (daysSinceActivity > 14) {
        probabilityScore -= 25;
        riskScore += 40;
        momentumScore -= 50;
        riskReasons.push(`Estagnado há ${daysSinceActivity} dias`);
      }

      // Close date
      if (!opp.expected_close_date) {
        probabilityScore -= 10;
        riskScore += 15;
        confidenceScore -= 15;
        riskReasons.push("Data de fecho em falta");
      } else {
        const closeDate = new Date(opp.expected_close_date);
        const daysToClose = Math.floor((closeDate.getTime() - now.getTime()) / 86400000);
        if (daysToClose < 0) {
          riskScore += 20;
          riskReasons.push("Data de fecho ultrapassada");
        } else if (daysToClose <= 7) {
          probabilityScore += 5;
          reasons.push("Fecho previsto nos próximos 7 dias");
        }
        confidenceScore += 10;
      }

      // Value presence
      if (!opp.value || opp.value <= 0) {
        confidenceScore -= 20;
        riskScore += 10;
        riskReasons.push("Valor do negócio em falta");
      } else {
        confidenceScore += 5;
      }

      // Notes / next step
      if (opp.notes && opp.notes.length > 20) {
        healthScore += 5;
        confidenceScore += 5;
      }

      // AI temperature
      if (opp.ai_temperature === "hot") {
        probabilityScore += 10;
        momentumScore += 15;
        reasons.push("Lead classificada como HOT pela IA");
      } else if (opp.ai_temperature === "cold") {
        probabilityScore -= 10;
        riskScore += 10;
      }

      // Priority level
      if (opp.priority_level === "high" || opp.priority_level === "urgent") {
        probabilityScore += 5;
        reasons.push("Prioridade alta");
      }

      // Stage position (higher = closer to close)
      const stagePosition = stage?.position ?? 0;
      if (stagePosition >= 4) {
        probabilityScore += 5;
        reasons.push("Em fase avançada do pipeline");
      }

      // Clamp all scores
      probabilityScore = Math.max(0, Math.min(100, probabilityScore));
      riskScore = Math.max(0, Math.min(100, riskScore));
      healthScore = Math.max(0, Math.min(100, healthScore - Math.floor(riskScore / 3)));
      momentumScore = Math.max(0, Math.min(100, momentumScore));
      confidenceScore = Math.max(0, Math.min(100, confidenceScore));

      // Recommended action
      let recommendedAction = "Monitorizar";
      if (riskScore > 60) recommendedAction = "Ação urgente: reativar negócio";
      else if (daysSinceActivity > stalledDays) recommendedAction = "Fazer follow-up imediato";
      else if (!opp.expected_close_date) recommendedAction = "Definir data de fecho";
      else if (probabilityScore >= 75 && !opp.notes) recommendedAction = "Preparar proposta";
      else if (probabilityScore >= 60) recommendedAction = "Avançar para próxima fase";

      const record = {
        workspace_id,
        opportunity_id: opp.id,
        probability_score: probabilityScore,
        risk_score: riskScore,
        health_score: healthScore,
        momentum_score: momentumScore,
        confidence_score: confidenceScore,
        model_version: "v1.0",
        explanation_json: {
          top_reasons: reasons.slice(0, 3),
          top_risk_reasons: riskReasons.slice(0, 3),
          stage_name: stage?.name,
          stage_probability: stageProbability,
          days_since_activity: daysSinceActivity,
        },
        recommended_action: recommendedAction,
        computed_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      results.push(record);
    }

    // Upsert all scores
    for (const r of results) {
      await supabase
        .from("deal_probability_scores")
        .upsert(r, { onConflict: "workspace_id,opportunity_id" });
    }

    console.log(`[REVENUE-FLIGHT] Computed probability for ${results.length} deals in workspace ${workspace_id}`);

    return new Response(
      JSON.stringify({ data: results, count: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[REVENUE-FLIGHT] compute-deal-probability error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
