import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandoverRequest {
  workspaceId: string;
  conversationId: string;
  reason: "contact_request" | "lack_of_info" | "max_retries" | "manual";
  assignToUserId?: string;
  closingMessage?: string;
  sleepDurationMinutes?: number;
  tagName?: string;
  botId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: HandoverRequest = await req.json();
    const {
      workspaceId,
      conversationId,
      reason,
      assignToUserId,
      closingMessage,
      sleepDurationMinutes = 1440, // 24h default
      tagName = "human_handover",
      botId,
    } = body;

    if (!workspaceId || !conversationId || !reason) {
      return new Response(
        JSON.stringify({ error: "workspaceId, conversationId, and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[HUMAN-HANDOVER] Starting handover for conversation=${conversationId} reason=${reason}`);

    const sleepUntil = new Date(Date.now() + sleepDurationMinutes * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // 1. Update conversation_ai_state
    const { error: stateError } = await supabaseAdmin
      .from("conversation_ai_state")
      .upsert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        handed_over: true,
        handed_over_to_user_id: assignToUserId || null,
        is_bot_sleeping: true,
        sleep_until: sleepUntil,
        handover_reason: reason,
        handover_at: now,
        handover_message: closingMessage || null,
        updated_at: now,
      }, {
        onConflict: "conversation_id",
      });

    if (stateError) {
      console.error("[HUMAN-HANDOVER] State update error:", stateError);
      throw stateError;
    }

    // 2. Assign conversation to user if specified
    if (assignToUserId) {
      await supabaseAdmin
        .from("conversations")
        .update({ assigned_to: assignToUserId })
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId);
    }

    // 3. Create task with due date +24h
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("lead_id, title")
      .eq("id", conversationId)
      .single();

    if (conversation) {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from("tasks")
        .insert({
          workspace_id: workspaceId,
          title: `Handover: ${conversation.title || "Conversa sem título"}`,
          description: `Bot transferiu esta conversa para atendimento humano.\nMotivo: ${reason}`,
          due_date: dueDate,
          assigned_to: assignToUserId || null,
          status: "pending",
          priority: "high",
          entity_type: "conversation",
          entity_id: conversationId,
        });

      // 4. Apply tag to lead if available
      if (conversation.lead_id && tagName) {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("tags")
          .eq("id", conversation.lead_id)
          .single();

        if (lead) {
          const currentTags = lead.tags || [];
          if (!currentTags.includes(tagName)) {
            await supabaseAdmin
              .from("leads")
              .update({ tags: [...currentTags, tagName] })
              .eq("id", conversation.lead_id);
          }
        }
      }
    }

    // 5. Send closing message if provided
    if (closingMessage) {
      await supabaseAdmin
        .from("messages")
        .insert({
          workspace_id: workspaceId,
          conversation_id: conversationId,
          content: closingMessage,
          direction: "outbound",
          sender_type: "bot",
          sender_id: botId || null,
          status: "sent",
        });
    }

    // 6. Log to autopilot_events
    await supabaseAdmin
      .from("autopilot_events")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        event_type: "human_handover",
        bot_id: botId || null,
        metadata: {
          reason,
          assigned_to: assignToUserId,
          sleep_until: sleepUntil,
          tag_applied: tagName,
        },
      });

    console.log(`[HUMAN-HANDOVER] Handover completed for conversation=${conversationId}`);

    return new Response(
      JSON.stringify({
        success: true,
        handover: {
          conversationId,
          reason,
          assignedTo: assignToUserId,
          sleepUntil,
          tagApplied: tagName,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[HUMAN-HANDOVER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
