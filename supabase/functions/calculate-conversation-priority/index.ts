import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workspace_id, conversation_id, batch, all_workspaces } = await req.json();

    if (batch && all_workspaces) {
      const { data: workspaces, error: wsError } = await supabase
        .from("conversations")
        .select("workspace_id")
        .eq("status", "open");

      if (wsError) throw wsError;

      const uniqueWsIds = [...new Set((workspaces || []).map((w: any) => w.workspace_id))];
      let totalUpdated = 0;

      for (const wsId of uniqueWsIds) {
        const count = await recalculateWorkspace(supabase, wsId as string);
        totalUpdated += count;
      }

      return new Response(
        JSON.stringify({ updated: totalUpdated, workspaces: uniqueWsIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (batch && workspace_id) {
      const count = await recalculateWorkspace(supabase, workspace_id);

      return new Response(
        JSON.stringify({ updated: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (conversation_id) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("id, channel, last_message_at, unread_count, status, ai_intent, ai_priority, lead_id, workspace_id")
        .eq("id", conversation_id)
        .single();

      if (error) throw error;

      let leadScore = 0;
      let potentialValue = 0;
      if (conv.lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("score, status")
          .eq("id", conv.lead_id)
          .single();
        leadScore = lead?.score || 0;

        const { data: opps } = await supabase
          .from("opportunities")
          .select("value, status")
          .eq("lead_id", conv.lead_id);
        const openOpps = (opps || []).filter((o: any) => o.status === "open");
        potentialValue = openOpps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

        // Determine conversion status from opportunities
        const wonOpps = (opps || []).filter((o: any) => o.status === "won");
        const wonRevenue = wonOpps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
        var conversionStatus = wonOpps.length > 0 ? "converted" : openOpps.length > 0 ? "opportunity" : "none";
        var revenue = wonRevenue;
      }

      const score = calculateScore(conv, leadScore, potentialValue);

      await supabase
        .from("conversations")
        .update({
          conversation_priority_score: score.score,
          conversation_status_simplified: score.status,
          sla_deadline: score.slaDeadline,
          potential_value_estimate: potentialValue,
        })
        .eq("id", conv.id);

      // Update conversation_analytics
      await updateConversationAnalytics(supabase, conv.id, conv.workspace_id, conv.lead_id, score.slaDeadline);

      return new Response(
        JSON.stringify({ score: score.score, status: score.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Missing conversation_id or batch+workspace_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateConversationAnalytics(
  supabase: any,
  conversationId: string,
  workspaceId: string,
  leadId: string | null,
  slaDeadline: string | null
) {
  try {
    // 1. Calculate avg response time from messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, direction, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    let totalResponseMinutes = 0;
    let responseCount = 0;

    if (msgs && msgs.length > 1) {
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].direction === "inbound" && msgs[i + 1].direction === "outbound") {
          const inTime = new Date(msgs[i].created_at).getTime();
          const outTime = new Date(msgs[i + 1].created_at).getTime();
          const diffMinutes = (outTime - inTime) / (1000 * 60);
          if (diffMinutes > 0 && diffMinutes < 10080) { // cap at 7 days
            totalResponseMinutes += diffMinutes;
            responseCount++;
          }
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : null;

    // 2. SLA breached check
    const slaBreached = slaDeadline ? new Date(slaDeadline).getTime() < Date.now() : false;

    // 3. AI suggestions used count
    const { count: aiCount } = await supabase
      .from("ai_agent_executions")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", conversationId)
      .eq("agent_type", "inbox_suggest");

    // 4. Conversion status + revenue from opportunities
    let conversionStatus = "none";
    let revenue = 0;

    if (leadId) {
      const { data: opps } = await supabase
        .from("opportunities")
        .select("value, status")
        .eq("lead_id", leadId);

      if (opps && opps.length > 0) {
        const wonOpps = opps.filter((o: any) => o.status === "won");
        const openOpps = opps.filter((o: any) => o.status === "open");
        revenue = wonOpps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
        conversionStatus = wonOpps.length > 0 ? "converted" : openOpps.length > 0 ? "opportunity" : "none";
      }
    }

    // Upsert analytics
    await supabase
      .from("conversation_analytics")
      .upsert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        avg_response_time_minutes: avgResponseTime,
        sla_breached: slaBreached,
        ai_suggestions_used: aiCount || 0,
        conversion_status: conversionStatus,
        revenue: revenue,
        updated_at: new Date().toISOString(),
      }, { onConflict: "conversation_id" });
  } catch (err) {
    console.error("Analytics update error:", err);
    // Non-blocking: don't fail priority calculation if analytics fails
  }
}

async function recalculateWorkspace(supabase: any, workspaceId: string): Promise<number> {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, channel, last_message_at, unread_count, status, ai_intent, ai_priority, lead_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .limit(500);

  if (error) throw error;

  const updates = [];
  for (const conv of conversations || []) {
    const score = calculateScore(conv);
    updates.push({
      id: conv.id,
      workspace_id: workspaceId,
      lead_id: conv.lead_id,
      conversation_priority_score: score.score,
      conversation_status_simplified: score.status,
      sla_deadline: score.slaDeadline,
    });
  }

  for (const update of updates) {
    await supabase
      .from("conversations")
      .update({
        conversation_priority_score: update.conversation_priority_score,
        conversation_status_simplified: update.conversation_status_simplified,
        sla_deadline: update.sla_deadline,
      })
      .eq("id", update.id);

    // Update analytics for each conversation in batch
    await updateConversationAnalytics(supabase, update.id, workspaceId, update.lead_id, update.sla_deadline);
  }

  return updates.length;
}

function calculateScore(
  conv: any,
  leadScore = 0,
  potentialValue = 0
): { score: number; status: string; slaDeadline: string | null } {
  let score = 0;

  const hoursSinceMessage = conv.last_message_at
    ? (Date.now() - new Date(conv.last_message_at).getTime()) / (1000 * 60 * 60)
    : 0;

  if (hoursSinceMessage > 48) score += 25;
  else if (hoursSinceMessage > 24) score += 20;
  else if (hoursSinceMessage > 12) score += 15;
  else if (hoursSinceMessage > 4) score += 10;
  else if (hoursSinceMessage > 1) score += 5;

  const slaHours = 24;
  const slaRatio = hoursSinceMessage / slaHours;
  if (slaRatio >= 1) score += 20;
  else if (slaRatio >= 0.75) score += 15;
  else if (slaRatio >= 0.5) score += 10;
  else if (slaRatio >= 0.25) score += 5;

  if (conv.ai_intent === "sales") score += 20;
  else if (conv.ai_intent === "complaint") score += 15;
  else if (conv.ai_intent === "support") score += 10;
  else if (conv.ai_intent === "question") score += 5;

  if (potentialValue > 10000) score += 15;
  else if (potentialValue > 5000) score += 12;
  else if (potentialValue > 1000) score += 8;
  else if (potentialValue > 0) score += 5;

  if (leadScore > 80) score += 10;
  else if (leadScore > 50) score += 7;
  else if (leadScore > 20) score += 4;

  const channelWeights: Record<string, number> = {
    whatsapp: 10, phone: 9, sms: 8, instagram: 6,
    facebook: 5, messenger: 5, webchat: 4, email: 3, other: 2,
  };
  score += channelWeights[conv.channel] || 2;

  score = Math.min(100, Math.max(0, score));

  let status = "REQUIRES_RESPONSE";
  if (conv.status === "closed") {
    status = "RESOLVED";
  } else if (potentialValue > 0) {
    status = "ACTIVE_OPPORTUNITY";
  } else if (conv.unread_count === 0 && hoursSinceMessage < 24) {
    status = "FOLLOW_UP";
  }

  const slaDeadline = conv.last_message_at
    ? new Date(new Date(conv.last_message_at).getTime() + slaHours * 60 * 60 * 1000).toISOString()
    : null;

  return { score, status, slaDeadline };
}
