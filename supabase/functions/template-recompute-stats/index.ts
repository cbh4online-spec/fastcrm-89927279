import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Adaptive weights by pipeline stage
function getWeights(pipelineStage?: string | null) {
  const stage = (pipelineStage || "").toLowerCase();
  if (["lead", "qualificação", "qualificacao", "novo", "new"].includes(stage)) {
    return { opp: 0.45, win: 0.35, reply: 0.10, progression: 0.10, timePenalty: 0.05 };
  }
  if (["proposta", "proposal", "negociação", "negociacao", "negotiation"].includes(stage)) {
    return { opp: 0.30, win: 0.50, reply: 0.05, progression: 0.05, timePenalty: 0.05 };
  }
  return { opp: 0.40, win: 0.40, reply: 0.10, progression: 0.10, timePenalty: 0.05 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { workspace_id, template_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("template_usage_events")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (template_id) {
      query = query.eq("template_id", template_id);
    }

    const { data: events, error } = await query;
    if (error) throw error;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No events to aggregate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group events by template_id + variant_id + channel + pipeline_stage + tone
    const groups: Record<string, typeof events> = {};
    for (const evt of events) {
      const key = `${evt.template_id}|${evt.variant_id || 'null'}|${evt.channel}|${evt.pipeline_stage || 'null'}|${evt.tone || 'null'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(evt);
    }

    const upserts = [];

    for (const [key, groupEvents] of Object.entries(groups)) {
      const [tid, vid, channel, stage, tone] = key.split("|");
      const pipelineStage = stage === "null" ? null : stage;
      
      const sent = groupEvents.filter(e => e.event_type === "sent").length;
      const replied = groupEvents.filter(e => e.event_type === "replied").length;
      const oppCreated = groupEvents.filter(e => e.event_type === "opportunity_created").length;
      const dealWon = groupEvents.filter(e => e.event_type === "deal_won").length;

      if (sent === 0) continue;

      // Calculate avg time to reply
      let avgTimeToReply = 0;
      const sentEvents = groupEvents.filter(e => e.event_type === "sent").sort((a, b) => 
        new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );
      const repliedEvents = groupEvents.filter(e => e.event_type === "replied");
      
      if (repliedEvents.length > 0 && sentEvents.length > 0) {
        let totalMinutes = 0;
        let count = 0;
        for (const re of repliedEvents) {
          const matchingSent = sentEvents
            .filter(se => se.conversation_id === re.conversation_id && new Date(se.event_at) < new Date(re.event_at))
            .pop();
          if (matchingSent) {
            const diffMs = new Date(re.event_at).getTime() - new Date(matchingSent.event_at).getTime();
            totalMinutes += diffMs / 60000;
            count++;
          }
        }
        avgTimeToReply = count > 0 ? totalMinutes / count : 0;
      }

      const replyRate = replied / sent;
      const oppRate = oppCreated / sent;
      const winRate = dealWon / sent;
      
      // Stage progression: use opportunity_created as proxy
      const stageProgressionRate = oppCreated / sent;

      // Legacy score (old formula for backward compat)
      const legacyTimePenalty = Math.min(avgTimeToReply / 1440, 1);
      const legacyScore = (replyRate * 0.3) + (oppRate * 0.35) + (winRate * 0.3) - (legacyTimePenalty * 0.05);

      // New weighted score with adaptive weights
      const w = getWeights(pipelineStage);
      const normalizedTimePenalty = Math.min(avgTimeToReply / 1440, 1);
      let weightedScore = 
        (winRate * w.win) + 
        (oppRate * w.opp) + 
        (replyRate * w.reply) + 
        (stageProgressionRate * w.progression) - 
        (normalizedTimePenalty * w.timePenalty);

      // Revenue multiplier based on avg potential_value
      const eventsWithValue = groupEvents.filter(e => e.potential_value && e.potential_value > 0);
      if (eventsWithValue.length > 0) {
        const avgPotentialValue = eventsWithValue.reduce((sum, e) => sum + (e.potential_value || 0), 0) / eventsWithValue.length;
        const multiplier = Math.min(1 + (avgPotentialValue / 10000 * 0.05), 1.25);
        weightedScore *= multiplier;
      }

      upserts.push({
        workspace_id,
        template_id: tid,
        variant_id: vid === "null" ? null : vid,
        channel,
        pipeline_stage: pipelineStage,
        tone: tone === "null" ? null : tone,
        samples: sent,
        reply_rate: Math.round(replyRate * 10000) / 10000,
        opportunity_rate: Math.round(oppRate * 10000) / 10000,
        win_rate: Math.round(winRate * 10000) / 10000,
        avg_time_to_reply_minutes: Math.round(avgTimeToReply * 100) / 100,
        score: Math.round(legacyScore * 10000) / 10000,
        stage_progression_rate: Math.round(stageProgressionRate * 10000) / 10000,
        weighted_score: Math.round(weightedScore * 10000) / 10000,
        updated_at: new Date().toISOString(),
      });
    }

    // Delete existing stats and insert fresh
    if (template_id) {
      await supabase
        .from("workspace_template_stats")
        .delete()
        .eq("workspace_id", workspace_id)
        .eq("template_id", template_id);
    } else {
      await supabase
        .from("workspace_template_stats")
        .delete()
        .eq("workspace_id", workspace_id);
    }

    if (upserts.length > 0) {
      const { error: insertError } = await supabase
        .from("workspace_template_stats")
        .insert(upserts);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true, stats_updated: upserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-recompute-stats error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
