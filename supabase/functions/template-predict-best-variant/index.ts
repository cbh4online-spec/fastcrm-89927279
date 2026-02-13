import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_SAMPLES = 50;
const EXPLOIT_RATE_HIGH = 0.8;
const EXPLOIT_RATE_LOW = 0.7; // 30% explore when samples < 50

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id,
      template_id,
      channel,
      pipeline_stage,
      industry,
      lead_score,
      intent_label,
      sentiment_label,
      potential_value,
    } = body;

    if (!workspace_id || !template_id) {
      return new Response(JSON.stringify({ error: "workspace_id and template_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all variants for this template
    const { data: variants, error: varError } = await supabase
      .from("communication_template_variants")
      .select("*")
      .eq("template_id", template_id)
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    if (varError) throw varError;
    if (!variants || variants.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        variant_id: null, 
        alternatives: [],
        rationale: "Sem variantes disponíveis para este template.",
        confidence: "low"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stats - prefer pipeline_stage-specific stats if available
    const variantIds = variants.map(v => v.id);
    let statsQuery = supabase
      .from("workspace_template_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("template_id", template_id)
      .in("variant_id", variantIds);

    if (channel) statsQuery = statsQuery.eq("channel", channel);

    const { data: stats } = await statsQuery;

    // Map stats to variants, using weighted_score
    const variantScores = variants.map(v => {
      let vStats = (stats || []).filter(s => s.variant_id === v.id);
      
      // Prefer stage-specific stats if available
      if (pipeline_stage) {
        const stageStats = vStats.filter(s => s.pipeline_stage === pipeline_stage);
        if (stageStats.length > 0) vStats = stageStats;
      }
      
      const totalSamples = vStats.reduce((sum, s) => sum + (s.samples || 0), 0);
      const avgWeightedScore = vStats.length > 0
        ? vStats.reduce((sum, s) => sum + ((s.weighted_score ?? s.score) || 0) * (s.samples || 0), 0) / Math.max(totalSamples, 1)
        : 0;
      const avgReplyRate = vStats.length > 0
        ? vStats.reduce((sum, s) => sum + (s.reply_rate || 0) * (s.samples || 0), 0) / Math.max(totalSamples, 1)
        : 0;
      const avgOppRate = vStats.length > 0
        ? vStats.reduce((sum, s) => sum + (s.opportunity_rate || 0) * (s.samples || 0), 0) / Math.max(totalSamples, 1)
        : 0;
      const avgWinRate = vStats.length > 0
        ? vStats.reduce((sum, s) => sum + (s.win_rate || 0) * (s.samples || 0), 0) / Math.max(totalSamples, 1)
        : 0;

      return {
        variant_id: v.id,
        variant_key: v.variant_key,
        tone: v.tone,
        samples: totalSamples,
        score: avgWeightedScore,
        reply_rate: avgReplyRate,
        opportunity_rate: avgOppRate,
        win_rate: avgWinRate,
      };
    });

    // Sort by weighted score descending
    variantScores.sort((a, b) => b.score - a.score);

    const totalSamplesAll = variantScores.reduce((sum, v) => sum + v.samples, 0);
    const hasEnoughData = totalSamplesAll >= MIN_SAMPLES;
    const exploitRate = hasEnoughData ? EXPLOIT_RATE_HIGH : EXPLOIT_RATE_LOW;

    let recommended: typeof variantScores[0];
    let exploration = false;

    if (totalSamplesAll === 0) {
      // No data at all: random
      recommended = variantScores[Math.floor(Math.random() * variantScores.length)];
      exploration = true;
    } else {
      const rand = Math.random();
      if (rand < exploitRate && variantScores.length > 0) {
        recommended = variantScores[0];
      } else {
        const others = variantScores.slice(1);
        recommended = others.length > 0 
          ? others[Math.floor(Math.random() * others.length)]
          : variantScores[0];
        exploration = true;
      }
    }

    // Heuristic: high lead_score → prefer direct tone
    if (lead_score && lead_score > 70 && !hasEnoughData) {
      const directVariant = variantScores.find(v => v.tone === "direct");
      if (directVariant) {
        recommended = directVariant;
      }
    }

    // Confidence thresholds: low < 50, medium 50-100, high > 100
    let confidence: "low" | "medium" | "high" = "low";
    if (recommended.samples >= 100) confidence = "high";
    else if (recommended.samples >= MIN_SAMPLES) confidence = "medium";

    // Revenue impact estimate
    const avgPotentialValue = potential_value || 0;
    const revenueImpactEstimate = recommended.score * avgPotentialValue * recommended.samples;

    // Rationale
    let rationale = "";
    if (totalSamplesAll === 0) {
      rationale = `Exploração: sem dados ainda. Testando variante "${recommended.variant_key}".`;
    } else if (!hasEnoughData) {
      rationale = `Exploração: apenas ${totalSamplesAll} amostras (mín: ${MIN_SAMPLES}). Testando "${recommended.variant_key}".`;
    } else if (exploration) {
      rationale = `Exploração controlada (${Math.round((1 - exploitRate) * 100)}%): testando "${recommended.variant_key}" para diversificar dados.`;
    } else {
      rationale = `"${recommended.variant_key}" tem melhor weighted score (${(recommended.score * 100).toFixed(1)}%) com ${recommended.samples} amostras. Win: ${(recommended.win_rate * 100).toFixed(1)}%, Opp: ${(recommended.opportunity_rate * 100).toFixed(1)}%.`;
    }

    const alternatives = variantScores
      .filter(v => v.variant_id !== recommended.variant_id)
      .slice(0, 3)
      .map(v => ({
        variant_id: v.variant_id,
        variant_key: v.variant_key,
        score: v.score,
        samples: v.samples,
        reply_rate: v.reply_rate,
        opportunity_rate: v.opportunity_rate,
        win_rate: v.win_rate,
      }));

    return new Response(JSON.stringify({
      success: true,
      variant_id: recommended.variant_id,
      variant_key: recommended.variant_key,
      score: recommended.score,
      confidence,
      rationale,
      exploration,
      alternatives,
      revenue_impact_estimate: Math.round(revenueImpactEstimate * 100) / 100,
      opportunity_rate: recommended.opportunity_rate,
      win_rate: recommended.win_rate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-predict-best-variant error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
