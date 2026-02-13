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
    const { workspace_id, contact_id, lead_id } = body;

    if (!workspace_id || (!contact_id && !lead_id)) {
      return new Response(JSON.stringify({ error: "workspace_id and (contact_id or lead_id) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find conversations for this contact/lead
    let conversationQuery = supabase
      .from("conversations")
      .select("id, channel")
      .eq("workspace_id", workspace_id);

    if (contact_id) conversationQuery = conversationQuery.eq("contact_id", contact_id);
    if (lead_id) conversationQuery = conversationQuery.eq("lead_id", lead_id);

    const { data: conversations } = await conversationQuery.limit(50);

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No conversations found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const convIds = conversations.map(c => c.id);

    // Get messages from these conversations (last 90 days)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, direction, content, created_at")
      .in("conversation_id", convIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(500);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No messages found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute response_latency_avg_minutes
    let totalLatency = 0;
    let latencyCount = 0;
    const msgsByConv: Record<string, typeof messages> = {};
    for (const m of messages) {
      if (!msgsByConv[m.conversation_id]) msgsByConv[m.conversation_id] = [];
      msgsByConv[m.conversation_id].push(m);
    }

    for (const [, convMsgs] of Object.entries(msgsByConv)) {
      for (let i = 1; i < convMsgs.length; i++) {
        const prev = convMsgs[i - 1];
        const curr = convMsgs[i];
        if (prev.direction === "outbound" && curr.direction === "inbound") {
          const diff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000;
          if (diff > 0 && diff < 10080) { // max 7 days
            totalLatency += diff;
            latencyCount++;
          }
        }
      }
    }
    const responseLatencyAvg = latencyCount > 0 ? totalLatency / latencyCount : 0;

    // Compute reply_rate_last_30d
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentMsgs = messages.filter(m => m.created_at >= thirtyDaysAgo);
    const outbound30 = recentMsgs.filter(m => m.direction === "outbound").length;
    const inbound30 = recentMsgs.filter(m => m.direction === "inbound").length;
    const replyRate = outbound30 > 0 ? Math.min(inbound30 / outbound30, 1) : 0;

    // Compute engagement_depth_score
    const inboundMsgs = messages.filter(m => m.direction === "inbound");
    const avgWordCount = inboundMsgs.length > 0
      ? inboundMsgs.reduce((sum, m) => sum + (m.content || "").split(/\s+/).length, 0) / inboundMsgs.length
      : 0;
    const avgTurns = Object.values(msgsByConv).reduce((sum, convMsgs) => sum + convMsgs.length, 0) / Math.max(Object.keys(msgsByConv).length, 1);
    const engagementDepth = Math.min((avgTurns / 10) * 0.5 + (avgWordCount / 50) * 0.5, 1);

    // Compute followup_needed_rate
    let followupNeeded = 0;
    for (const [, convMsgs] of Object.entries(msgsByConv)) {
      let consecutiveOutbound = 0;
      for (const m of convMsgs) {
        if (m.direction === "outbound") {
          consecutiveOutbound++;
          if (consecutiveOutbound > 1) { followupNeeded++; break; }
        } else {
          consecutiveOutbound = 0;
        }
      }
    }
    const followupRate = Object.keys(msgsByConv).length > 0 ? followupNeeded / Object.keys(msgsByConv).length : 0;

    // Channel preference
    const channelCounts: Record<string, number> = {};
    for (const c of conversations) {
      const ch = c.channel || "email";
      const inboundCount = (msgsByConv[c.id] || []).filter(m => m.direction === "inbound").length;
      channelCounts[ch] = (channelCounts[ch] || 0) + inboundCount;
    }
    const channelPref = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Reading proxy score
    const normalizedLatency = Math.max(0, 1 - (responseLatencyAvg / 1440)); // 1 day normalization
    const readingProxy = Math.min((replyRate * 0.6 + normalizedLatency * 0.4), 1);

    // Last seen
    const lastInbound = inboundMsgs.length > 0 ? inboundMsgs[inboundMsgs.length - 1].created_at : null;

    // Upsert
    const { error } = await supabase
      .from("lead_behavior_signals")
      .upsert({
        workspace_id,
        contact_id: contact_id || null,
        lead_id: lead_id || null,
        channel_preference: channelPref,
        response_latency_avg_minutes: Math.round(responseLatencyAvg * 100) / 100,
        reply_rate_last_30d: Math.round(replyRate * 10000) / 10000,
        followup_needed_rate: Math.round(followupRate * 10000) / 10000,
        reading_proxy_score: Math.round(readingProxy * 10000) / 10000,
        engagement_depth_score: Math.round(engagementDepth * 10000) / 10000,
        last_seen_at: lastInbound,
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: "workspace_id,contact_id,lead_id",
        ignoreDuplicates: false,
      });

    if (error) {
      // Fallback: try insert if upsert fails due to unique constraint
      console.warn("Upsert failed, trying delete+insert:", error.message);
      await supabase
        .from("lead_behavior_signals")
        .delete()
        .eq("workspace_id", workspace_id)
        .match(contact_id ? { contact_id } : { lead_id });

      await supabase
        .from("lead_behavior_signals")
        .insert({
          workspace_id,
          contact_id: contact_id || null,
          lead_id: lead_id || null,
          channel_preference: channelPref,
          response_latency_avg_minutes: Math.round(responseLatencyAvg * 100) / 100,
          reply_rate_last_30d: Math.round(replyRate * 10000) / 10000,
          followup_needed_rate: Math.round(followupRate * 10000) / 10000,
          reading_proxy_score: Math.round(readingProxy * 10000) / 10000,
          engagement_depth_score: Math.round(engagementDepth * 10000) / 10000,
          last_seen_at: lastInbound,
          last_updated_at: new Date().toISOString(),
        });
    }

    return new Response(JSON.stringify({
      success: true,
      signals: {
        response_latency_avg_minutes: responseLatencyAvg,
        reply_rate_last_30d: replyRate,
        engagement_depth_score: engagementDepth,
        followup_needed_rate: followupRate,
        channel_preference: channelPref,
        reading_proxy_score: readingProxy,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-lead-behavior-signals error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
