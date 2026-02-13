import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { workspace_id, conversation_id, batch } = await req.json();

    if (batch && workspace_id) {
      // Batch mode: recalculate all open conversations for a workspace
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("id, channel, last_message_at, unread_count, status, ai_intent, ai_priority, lead_id")
        .eq("workspace_id", workspace_id)
        .eq("status", "open")
        .limit(500);

      if (error) throw error;

      const updates = [];
      for (const conv of conversations || []) {
        const score = calculateScore(conv);
        updates.push({
          id: conv.id,
          conversation_priority_score: score.score,
          conversation_status_simplified: score.status,
          sla_deadline: score.slaDeadline,
        });
      }

      // Batch update
      for (const update of updates) {
        await supabase
          .from("conversations")
          .update({
            conversation_priority_score: update.conversation_priority_score,
            conversation_status_simplified: update.conversation_status_simplified,
            sla_deadline: update.sla_deadline,
          })
          .eq("id", update.id);
      }

      return new Response(
        JSON.stringify({ updated: updates.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (conversation_id) {
      // Single conversation mode
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("id, channel, last_message_at, unread_count, status, ai_intent, ai_priority, lead_id, workspace_id")
        .eq("id", conversation_id)
        .single();

      if (error) throw error;

      // Get lead score and opportunity value
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
          .select("value")
          .eq("lead_id", conv.lead_id)
          .eq("status", "open");
        potentialValue = opps?.reduce((sum: number, o: any) => sum + (o.value || 0), 0) || 0;
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

function calculateScore(
  conv: any,
  leadScore = 0,
  potentialValue = 0
): { score: number; status: string; slaDeadline: string | null } {
  let score = 0;

  // 1. Time since last inbound message (25%)
  const hoursSinceMessage = conv.last_message_at
    ? (Date.now() - new Date(conv.last_message_at).getTime()) / (1000 * 60 * 60)
    : 0;

  if (hoursSinceMessage > 48) score += 25;
  else if (hoursSinceMessage > 24) score += 20;
  else if (hoursSinceMessage > 12) score += 15;
  else if (hoursSinceMessage > 4) score += 10;
  else if (hoursSinceMessage > 1) score += 5;

  // 2. SLA proximity (20%)
  const slaHours = 24; // Default SLA: 24h
  const slaRatio = hoursSinceMessage / slaHours;
  if (slaRatio >= 1) score += 20;
  else if (slaRatio >= 0.75) score += 15;
  else if (slaRatio >= 0.5) score += 10;
  else if (slaRatio >= 0.25) score += 5;

  // 3. AI intent classification (20%)
  if (conv.ai_intent === "sales") score += 20;
  else if (conv.ai_intent === "complaint") score += 15;
  else if (conv.ai_intent === "support") score += 10;
  else if (conv.ai_intent === "question") score += 5;

  // 4. Potential value (15%)
  if (potentialValue > 10000) score += 15;
  else if (potentialValue > 5000) score += 12;
  else if (potentialValue > 1000) score += 8;
  else if (potentialValue > 0) score += 5;

  // 5. Lead score (10%)
  if (leadScore > 80) score += 10;
  else if (leadScore > 50) score += 7;
  else if (leadScore > 20) score += 4;

  // 6. Channel weight (10%)
  const channelWeights: Record<string, number> = {
    whatsapp: 10,
    phone: 9,
    sms: 8,
    instagram: 6,
    facebook: 5,
    messenger: 5,
    webchat: 4,
    email: 3,
    other: 2,
  };
  score += channelWeights[conv.channel] || 2;

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  // Determine simplified status
  let status = "REQUIRES_RESPONSE";
  if (conv.status === "closed") {
    status = "RESOLVED";
  } else if (potentialValue > 0) {
    status = "ACTIVE_OPPORTUNITY";
  } else if (conv.unread_count === 0 && hoursSinceMessage < 24) {
    status = "FOLLOW_UP";
  }

  // SLA deadline
  const slaDeadline = conv.last_message_at
    ? new Date(new Date(conv.last_message_at).getTime() + slaHours * 60 * 60 * 1000).toISOString()
    : null;

  return { score, status, slaDeadline };
}
