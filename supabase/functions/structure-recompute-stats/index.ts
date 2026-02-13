import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getWeights(pipelineStage?: string | null) {
  const stage = (pipelineStage || "").toLowerCase();
  if (["lead", "qualificação", "qualificacao", "novo", "new"].includes(stage)) {
    return { win: 0.45, opp: 0.45, reply: 0.10, timePenalty: 0.05 };
  }
  if (["proposta", "proposal", "negociação", "negociacao", "negotiation"].includes(stage)) {
    return { win: 0.65, opp: 0.25, reply: 0.05, timePenalty: 0.05 };
  }
  return { win: 0.55, opp: 0.35, reply: 0.10, timePenalty: 0.05 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events, error } = await supabase
      .from("structure_usage_events")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No events to aggregate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also get length events to enrich with chosen_length
    const { data: lengthEvents } = await supabase
      .from("message_length_events")
      .select("conversation_id, template_id, structure_key, channel, chosen_length")
      .eq("workspace_id", workspace_id)
      .eq("event_type", "composed");

    // Build lookup: conversation_id+structure_key+channel -> chosen_length
    const lengthLookup: Record<string, string> = {};
    if (lengthEvents) {
      for (const le of lengthEvents) {
        const key = `${le.conversation_id || ''}|${le.structure_key}|${le.channel}`;
        lengthLookup[key] = le.chosen_length;
      }
    }

    // Group by structure_key + channel + pipeline_stage + intent_label + chosen_length
    const groups: Record<string, typeof events> = {};
    for (const evt of events) {
      const lengthKey = `${evt.conversation_id || ''}|${evt.structure_key}|${evt.channel}`;
      const chosenLength = lengthLookup[lengthKey] || null;
      const key = `${evt.structure_key}|${evt.channel}|${evt.pipeline_stage || 'null'}|${evt.intent_label || 'null'}|${chosenLength || 'null'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(evt);
    }

    const upserts = [];

    for (const [key, groupEvents] of Object.entries(groups)) {
      const [structureKey, channel, stage, intentLabel, chosenLen] = key.split("|");
      const pipelineStage = stage === "null" ? null : stage;
      const intent = intentLabel === "null" ? null : intentLabel;
      const chosenLength = chosenLen === "null" ? null : chosenLen;

      const sent = groupEvents.filter(e => e.event_type === "sent").length;
      const replied = groupEvents.filter(e => e.event_type === "replied").length;
      const oppCreated = groupEvents.filter(e => e.event_type === "opportunity_created").length;
      const dealWon = groupEvents.filter(e => e.event_type === "deal_won").length;

      if (sent === 0) continue;

      // Avg time to reply
      let avgTimeToReply = 0;
      const sentEvents = groupEvents.filter(e => e.event_type === "sent").sort((a, b) =>
        new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );
      const repliedEvents = groupEvents.filter(e => e.event_type === "replied");

      if (repliedEvents.length > 0 && sentEvents.length > 0) {
        let totalMinutes = 0, count = 0;
        for (const re of repliedEvents) {
          const matchingSent = sentEvents
            .filter(se => se.conversation_id === re.conversation_id && new Date(se.event_at) < new Date(re.event_at))
            .pop();
          if (matchingSent) {
            totalMinutes += (new Date(re.event_at).getTime() - new Date(matchingSent.event_at).getTime()) / 60000;
            count++;
          }
        }
        avgTimeToReply = count > 0 ? totalMinutes / count : 0;
      }

      const replyRate = replied / sent;
      const oppRate = oppCreated / sent;
      const winRate = dealWon / sent;

      const w = getWeights(pipelineStage);
      const normalizedTimePenalty = Math.min(avgTimeToReply / 1440, 1);
      let score = (winRate * w.win) + (oppRate * w.opp) + (replyRate * w.reply) - (normalizedTimePenalty * w.timePenalty);

      // Revenue multiplier
      const eventsWithValue = groupEvents.filter(e => e.potential_value && e.potential_value > 0);
      if (eventsWithValue.length > 0) {
        const avgPV = eventsWithValue.reduce((sum, e) => sum + (e.potential_value || 0), 0) / eventsWithValue.length;
        score *= Math.min(1 + (avgPV / 100000 * 0.15), 1.15);
      }

      upserts.push({
        workspace_id,
        structure_key: structureKey,
        channel,
        pipeline_stage: pipelineStage,
        intent_label: intent,
        chosen_length: chosenLength,
        samples: sent,
        opportunity_rate: Math.round(oppRate * 10000) / 10000,
        win_rate: Math.round(winRate * 10000) / 10000,
        reply_rate: Math.round(replyRate * 10000) / 10000,
        avg_time_to_reply_minutes: Math.round(avgTimeToReply * 100) / 100,
        score: Math.round(score * 10000) / 10000,
        updated_at: new Date().toISOString(),
      });
    }

    // Delete + insert
    await supabase.from("workspace_structure_stats").delete().eq("workspace_id", workspace_id);

    if (upserts.length > 0) {
      const { error: insertError } = await supabase.from("workspace_structure_stats").insert(upserts);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ success: true, stats_updated: upserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-recompute-stats error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
