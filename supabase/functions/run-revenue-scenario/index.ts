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

    const { workspace_id, scenario_name, scenario_type, input_json } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    // Get latest snapshot
    const { data: snapshot } = await supabase
      .from("revenue_forecast_snapshots")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!snapshot) throw new Error("No forecast snapshot available");

    let adjustedMostLikely = snapshot.most_likely_revenue;
    let adjustedBestCase = snapshot.best_case_revenue;
    let adjustedGap = snapshot.forecast_gap;
    const input = input_json || {};

    // Apply scenario adjustments
    if (input.additional_deals_closed) {
      const avgDealValue = input.avg_deal_value || 5000;
      const addedRevenue = input.additional_deals_closed * avgDealValue;
      adjustedMostLikely += addedRevenue;
      adjustedBestCase += addedRevenue;
    }

    if (input.conversion_rate_improvement) {
      const improvement = input.conversion_rate_improvement / 100;
      const pipelineBoost = snapshot.weighted_pipeline * improvement;
      adjustedMostLikely += pipelineBoost;
    }

    if (input.reactivated_deals) {
      const reactivatedValue = input.reactivated_deals * (input.avg_reactivated_value || 3000) * 0.4;
      adjustedMostLikely += reactivatedValue;
    }

    if (input.new_meetings_booked) {
      const meetingValue = input.new_meetings_booked * (input.avg_deal_value || 5000) * 0.15;
      adjustedMostLikely += meetingValue;
    }

    if (input.deal_slipped_value) {
      adjustedMostLikely -= input.deal_slipped_value;
      adjustedBestCase -= input.deal_slipped_value;
    }

    adjustedGap = snapshot.target_revenue - adjustedMostLikely;
    const adjustedHitProb = snapshot.target_revenue > 0
      ? Math.min(1.5, Math.max(0, adjustedMostLikely / snapshot.target_revenue))
      : 0;

    const output_json = {
      original_most_likely: snapshot.most_likely_revenue,
      adjusted_most_likely: adjustedMostLikely,
      original_best_case: snapshot.best_case_revenue,
      adjusted_best_case: adjustedBestCase,
      original_gap: snapshot.forecast_gap,
      adjusted_gap: adjustedGap,
      original_hit_probability: snapshot.target_hit_probability,
      adjusted_hit_probability: adjustedHitProb,
      target_revenue: snapshot.target_revenue,
      delta: adjustedMostLikely - snapshot.most_likely_revenue,
    };

    // Save scenario
    const { data: scenarioData } = await supabase
      .from("revenue_scenarios")
      .insert({
        workspace_id,
        scenario_name: scenario_name || "Cenário personalizado",
        scenario_type: scenario_type || "custom",
        input_json,
        output_json,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ data: { scenario: scenarioData, output: output_json } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[REVENUE-FLIGHT] run-revenue-scenario error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
