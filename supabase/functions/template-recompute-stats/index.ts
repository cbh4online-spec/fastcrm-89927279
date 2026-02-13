import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get all events for this workspace (and optionally template)
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

    // Group events by template_id + variant_id + channel
    const groups: Record<string, typeof events> = {};
    for (const evt of events) {
      const key = `${evt.template_id}|${evt.variant_id || 'null'}|${evt.channel}|${evt.pipeline_stage || 'null'}|${evt.tone || 'null'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(evt);
    }

    // Default weights
    const w1 = 0.3; // reply_rate
    const w2 = 0.35; // opportunity_rate
    const w3 = 0.3; // win_rate
    const w4 = 0.05; // time penalty

    const upserts = [];

    for (const [key, groupEvents] of Object.entries(groups)) {
      const [tid, vid, channel, stage, tone] = key.split("|");
      
      const sent = groupEvents.filter(e => e.event_type === "sent").length;
      const replied = groupEvents.filter(e => e.event_type === "replied").length;
      const oppCreated = groupEvents.filter(e => e.event_type === "opportunity_created").length;
      const dealWon = groupEvents.filter(e => e.event_type === "deal_won").length;

      if (sent === 0) continue;

      // Calculate avg time to reply (minutes between sent and replied)
      let avgTimeToReply = 0;
      const sentEvents = groupEvents.filter(e => e.event_type === "sent").sort((a, b) => 
        new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );
      const repliedEvents = groupEvents.filter(e => e.event_type === "replied");
      
      if (repliedEvents.length > 0 && sentEvents.length > 0) {
        let totalMinutes = 0;
        let count = 0;
        for (const re of repliedEvents) {
          // Find the closest sent event before this reply in the same conversation
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
      
      // Normalize time penalty (cap at 1440 min = 24h)
      const timePenalty = Math.min(avgTimeToReply / 1440, 1);
      const score = (replyRate * w1) + (oppRate * w2) + (winRate * w3) - (timePenalty * w4);

      upserts.push({
        workspace_id,
        template_id: tid,
        variant_id: vid === "null" ? null : vid,
        channel,
        pipeline_stage: stage === "null" ? null : stage,
        tone: tone === "null" ? null : tone,
        samples: sent,
        reply_rate: Math.round(replyRate * 10000) / 10000,
        opportunity_rate: Math.round(oppRate * 10000) / 10000,
        win_rate: Math.round(winRate * 10000) / 10000,
        avg_time_to_reply_minutes: Math.round(avgTimeToReply * 100) / 100,
        score: Math.round(score * 10000) / 10000,
        updated_at: new Date().toISOString(),
      });
    }

    // Delete existing stats and insert fresh (simpler than complex upsert)
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
