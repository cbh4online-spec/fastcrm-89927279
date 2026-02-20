import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPLOIT_RATE = 0.8;

// Strategic prior weights for cold-start exploration
const PRIOR_WEIGHTS: Record<string, number> = {
  "AIDA": 1.0,
  "AIDA_SHORT": 1.0,
  "PAS": 1.1,
  "BAB": 1.15,
  "4P": 1.25,
  "REENGAGE": 0.9,
};

const DEFAULT_PRIOR = 1.0;
const PRIOR_BASE_SCORE = 0.1; // Base score for structures with no samples when others have data

function weightedRandomSelect(keys: string[]): string {
  const weights = keys.map(k => PRIOR_WEIGHTS[k] ?? DEFAULT_PRIOR);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < keys.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id, channel, pipeline_stage, intent_label,
      sentiment_label, lead_score, potential_value, allowed_structures,
    } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stats
    let query = supabase
      .from("workspace_structure_stats")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (channel) query = query.eq("channel", channel);

    const { data: stats } = await query;

    // Get all available structures
    const { data: structures } = await supabase
      .from("persuasion_structures")
      .select("key, label, channel")
      .or(`channel.eq.all,channel.eq.${channel || 'all'}`);

    const availableKeys = allowed_structures && allowed_structures.length > 0
      ? allowed_structures
      : (structures || []).map((s: any) => s.key);

    // Build scores per structure key
    const scoreMap: Record<string, { score: number; samples: number; oppRate: number; winRate: number; replyRate: number }> = {};

    for (const key of availableKeys) {
      let relevantStats = (stats || []).filter((s: any) => s.structure_key === key);

      // Prefer stage-specific
      if (pipeline_stage) {
        const stageStats = relevantStats.filter((s: any) => s.pipeline_stage === pipeline_stage);
        if (stageStats.length > 0) relevantStats = stageStats;
      }

      const totalSamples = relevantStats.reduce((sum: number, s: any) => sum + (s.samples || 0), 0);
      const avgScore = totalSamples > 0
        ? relevantStats.reduce((sum: number, s: any) => sum + (s.score || 0) * (s.samples || 0), 0) / totalSamples
        : 0;
      const avgOpp = totalSamples > 0
        ? relevantStats.reduce((sum: number, s: any) => sum + (s.opportunity_rate || 0) * (s.samples || 0), 0) / totalSamples
        : 0;
      const avgWin = totalSamples > 0
        ? relevantStats.reduce((sum: number, s: any) => sum + (s.win_rate || 0) * (s.samples || 0), 0) / totalSamples
        : 0;
      const avgReply = totalSamples > 0
        ? relevantStats.reduce((sum: number, s: any) => sum + (s.reply_rate || 0) * (s.samples || 0), 0) / totalSamples
        : 0;

      // When structure has no samples but others do, use prior weight as initial score
      let finalScore = avgScore;
      if (totalSamples === 0) {
        finalScore = PRIOR_BASE_SCORE * (PRIOR_WEIGHTS[key] ?? DEFAULT_PRIOR);
      }

      scoreMap[key] = { score: finalScore, samples: totalSamples, oppRate: avgOpp, winRate: avgWin, replyRate: avgReply };
    }

    // Sort by score
    const ranked = Object.entries(scoreMap)
      .map(([key, data]) => ({ structure_key: key, ...data }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        best_structure_key: "AIDA",
        confidence: "low",
        rationale: "Sem dados. Usando AIDA como padrão.",
        exploration: true,
        alternatives: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalSamplesAll = ranked.reduce((sum, r) => sum + r.samples, 0);

    // Bandit selection
    let selected = ranked[0];
    let exploration = false;

    if (totalSamplesAll === 0) {
      // No data at all: weighted random selection based on prior weights
      const selectedKey = weightedRandomSelect(ranked.map(r => r.structure_key));
      selected = ranked.find(r => r.structure_key === selectedKey) || ranked[0];
      exploration = true;
    } else {
      const rand = Math.random();
      if (rand >= EXPLOIT_RATE && ranked.length > 1) {
        const others = ranked.slice(1);
        selected = others[Math.floor(Math.random() * others.length)];
        exploration = true;
      }
    }

    // Confidence
    let confidence: "low" | "medium" | "high" = "low";
    if (selected.samples >= 100) confidence = "high";
    else if (selected.samples >= 30) confidence = "medium";

    // Rationale
    let rationale = "";
    if (totalSamplesAll === 0) {
      rationale = `Exploração: sem dados. Testando "${selected.structure_key}" (peso estratégico: ${(PRIOR_WEIGHTS[selected.structure_key] ?? DEFAULT_PRIOR).toFixed(2)}).`;
    } else if (exploration) {
      rationale = `Exploração controlada (20%): testando "${selected.structure_key}" para diversificar.`;
    } else {
      rationale = `"${selected.structure_key}" é a melhor estrutura (score ${(selected.score * 100).toFixed(1)}%, ${selected.samples} amostras). Win: ${(selected.winRate * 100).toFixed(1)}%, Opp: ${(selected.oppRate * 100).toFixed(1)}%.`;
    }

    const alternatives = ranked
      .filter(r => r.structure_key !== selected.structure_key)
      .slice(0, 3)
      .map(r => ({
        structure_key: r.structure_key,
        score: r.score,
        samples: r.samples,
        opportunity_rate: r.oppRate,
        win_rate: r.winRate,
        reply_rate: r.replyRate,
      }));

    return new Response(JSON.stringify({
      success: true,
      best_structure_key: selected.structure_key,
      score: selected.score,
      confidence,
      rationale,
      exploration,
      alternatives,
      opportunity_rate: selected.oppRate,
      win_rate: selected.winRate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-predict-best error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
