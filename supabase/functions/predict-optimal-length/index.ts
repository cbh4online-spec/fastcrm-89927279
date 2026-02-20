import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPLOIT_RATE = 0.8;
const LENGTHS = ["short", "medium", "long"] as const;
type LengthChoice = typeof LENGTHS[number];

const DEFAULT_PROFILES: Record<string, Record<string, number>> = {
  email: { short: 700, medium: 1200, long: 1600 },
  whatsapp: { short: 220, medium: 350, long: 500 },
};

interface BehaviorSignals {
  response_latency_avg_minutes: number;
  reply_rate_last_30d: number;
  followup_needed_rate: number;
  reading_proxy_score: number;
  engagement_depth_score: number;
  channel_preference: string | null;
}

function heuristicLength(
  channel: string,
  signals: BehaviorSignals | null,
  pipelineStage?: string | null,
  intentLabel?: string | null,
): LengthChoice {
  const ch = (channel || "email").toLowerCase();

  if (ch === "whatsapp") {
    // METODOPARE: WhatsApp default is SHORT
    if (signals) {
      if (signals.engagement_depth_score > 0.5) return "medium";
      if (signals.response_latency_avg_minutes <= 60 && signals.reply_rate_last_30d > 0.3) return "medium";
    }
    return "short";
  }

  // Email: default MEDIUM
  if (signals) {
    if (signals.reading_proxy_score > 0.6) return "long";
    if (signals.response_latency_avg_minutes > 300) return "short";
  }
  const intent = (intentLabel || "").toLowerCase();
  if (["price", "objection", "preço", "objeção"].includes(intent)) return "medium";
  return "medium";
}

// Hard caps de segurança
function applyHardCaps(
  chosenLength: LengthChoice,
  channel: string,
  pipelineStage?: string | null,
  signals?: BehaviorSignals | null,
): LengthChoice {
  const ch = (channel || "email").toLowerCase();
  const stage = (pipelineStage || "").toLowerCase();

  // WhatsApp + Proposta/Negociação: nunca long
  if (ch === "whatsapp" && ["proposta", "proposal", "negociação", "negociacao", "negotiation"].includes(stage)) {
    if (chosenLength === "long") return "medium";
  }

  // Email + Proposta complexa: nunca short
  if (ch === "email" && ["proposta", "proposal", "negociação", "negociacao", "negotiation"].includes(stage)) {
    if (chosenLength === "short") return "medium";
  }

  // Lead com latência alta: nunca long
  if (signals && signals.response_latency_avg_minutes > 300) {
    if (chosenLength === "long") return "medium";
  }

  return chosenLength;
}

function getAdjacentLengths(length: LengthChoice): LengthChoice[] {
  if (length === "short") return ["medium"];
  if (length === "long") return ["medium"];
  return ["short", "long"];
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
      workspace_id, structure_key, channel, pipeline_stage, intent_label,
      contact_id, lead_id,
    } = body;

    if (!workspace_id || !structure_key) {
      return new Response(JSON.stringify({ error: "workspace_id and structure_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ch = channel || "email";

    // 1. Get behavior signals
    let signals: BehaviorSignals | null = null;
    if (contact_id || lead_id) {
      let sigQuery = supabase
        .from("lead_behavior_signals")
        .select("*")
        .eq("workspace_id", workspace_id);
      if (contact_id) sigQuery = sigQuery.eq("contact_id", contact_id);
      else if (lead_id) sigQuery = sigQuery.eq("lead_id", lead_id);

      const { data: sigData } = await sigQuery.limit(1).single();
      if (sigData) {
        signals = {
          response_latency_avg_minutes: sigData.response_latency_avg_minutes || 0,
          reply_rate_last_30d: sigData.reply_rate_last_30d || 0,
          followup_needed_rate: sigData.followup_needed_rate || 0,
          reading_proxy_score: sigData.reading_proxy_score || 0,
          engagement_depth_score: sigData.engagement_depth_score || 0,
          channel_preference: sigData.channel_preference || null,
        };
      }
    }

    // 2. Get workspace stats by length
    const { data: stats } = await supabase
      .from("workspace_structure_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("structure_key", structure_key)
      .eq("channel", ch)
      .not("chosen_length", "is", null);

    // Score per length
    const lengthScores: Record<string, { score: number; samples: number }> = {};
    for (const len of LENGTHS) {
      let relevant = (stats || []).filter((s: any) => s.chosen_length === len);
      if (pipeline_stage) {
        const staged = relevant.filter((s: any) => s.pipeline_stage === pipeline_stage);
        if (staged.length > 0) relevant = staged;
      }
      const totalSamples = relevant.reduce((sum: number, s: any) => sum + (s.samples || 0), 0);
      const avgScore = totalSamples > 0
        ? relevant.reduce((sum: number, s: any) => sum + (s.score || 0) * (s.samples || 0), 0) / totalSamples
        : 0;
      lengthScores[len] = { score: avgScore, samples: totalSamples };
    }

    const totalSamples = Object.values(lengthScores).reduce((sum, ls) => sum + ls.samples, 0);

    // 3. Decision
    let chosenLength: LengthChoice;
    let exploration = false;
    let rationale = "";

    if (totalSamples < 30) {
      // Use heuristic
      chosenLength = heuristicLength(ch, signals, pipeline_stage, intent_label);
      rationale = `Heurística base (${totalSamples} amostras). Sinais: latência ${signals?.response_latency_avg_minutes?.toFixed(0) || 'N/A'}min, engagement ${signals?.engagement_depth_score?.toFixed(2) || 'N/A'}.`;
    } else {
      // Bandit selection
      const ranked = LENGTHS.map(l => ({ length: l, ...lengthScores[l] })).sort((a, b) => b.score - a.score);
      
      if (Math.random() < EXPLOIT_RATE) {
        chosenLength = ranked[0].length;
        rationale = `Exploit: "${chosenLength}" (score ${(ranked[0].score * 100).toFixed(1)}%, ${ranked[0].samples} amostras).`;
      } else {
        // Explore adjacent
        const adjacent = getAdjacentLengths(ranked[0].length);
        chosenLength = adjacent[Math.floor(Math.random() * adjacent.length)];
        exploration = true;
        rationale = `Exploração 20%: testando "${chosenLength}" (adjacente ao melhor "${ranked[0].length}").`;
      }
    }

    // 4. Apply hard caps
    chosenLength = applyHardCaps(chosenLength, ch, pipeline_stage, signals);

    // 5. Get char limit from structure's length_profiles
    const { data: structureDef } = await supabase
      .from("persuasion_structures")
      .select("length_profiles")
      .eq("key", structure_key)
      .single();

    const profiles = structureDef?.length_profiles as Record<string, Record<string, number>> | null;
    const channelProfiles = profiles?.[ch] || DEFAULT_PROFILES[ch] || DEFAULT_PROFILES.email;
    const targetCharLimit = channelProfiles[chosenLength] || channelProfiles.medium || 1200;

    // 5. Confidence
    const lengthSamples = lengthScores[chosenLength]?.samples || 0;
    let confidence: "low" | "medium" | "high" = "low";
    if (lengthSamples >= 100) confidence = "high";
    else if (lengthSamples >= 30) confidence = "medium";

    return new Response(JSON.stringify({
      success: true,
      chosen_length: chosenLength,
      target_char_limit: targetCharLimit,
      confidence,
      rationale,
      exploration,
      signals_used: !!signals,
      length_scores: Object.fromEntries(
        LENGTHS.map(l => [l, { score: lengthScores[l].score, samples: lengthScores[l].samples }])
      ),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-optimal-length error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
