/**
 * WhatsApp Autopilot - Shared logic for triggering AI auto-replies on WhatsApp messages
 * Ported from ghl-webhook-message autopilot pattern, adapted for WhatsApp Cloud API
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface WhatsAppAutopilotParams {
  workspaceId: string;
  conversationId: string;
  messageId: string;
  channel: string;
  leadId: string | null;
  contactId: string | null;
  senderId: string;
  phoneNumberId: string;
}

export async function triggerWhatsAppAutopilot(
  supabase: SupabaseClient,
  params: WhatsAppAutopilotParams
): Promise<void> {
  const { workspaceId, conversationId, channel, leadId, senderId, phoneNumberId } = params;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log("[WA-AUTOPILOT] Checking config", { workspaceId, conversationId });

  // 1. Check ai_agents FIRST, then fallback to legacy autopilot_config
  let autopilotConfig: any = null;
  let agentSource: any = null;

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .eq("channel", channel)
    .eq("autopilot_enabled", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (agent) {
    agentSource = agent;
    autopilotConfig = {
      id: agent.id,
      is_active: true,
      persona_id: agent.persona_id,
      response_delay_min: agent.response_delay_min || 8,
      response_delay_max: agent.response_delay_max || 12,
      max_messages_per_conversation: agent.max_messages_per_conversation || 25,
      max_consecutive_bot_messages: agent.max_consecutive_bot_messages || 3,
      sleep_on_human_reply: agent.sleep_on_human_reply ?? true,
      respect_working_hours: agent.respect_working_hours ?? false,
      working_hours_start: agent.working_hours_start || "09:00",
      working_hours_end: agent.working_hours_end || "18:00",
      working_days: agent.working_days || [1,2,3,4,5],
      timezone: agent.timezone || "Europe/Lisbon",
      out_of_hours_message: agent.out_of_hours_message || null,
      typing_indicator: agent.typing_indicator ?? true,
      config_scope: "channel",
      source: "ai_agent"
    };
    console.log("[WA-AUTOPILOT] Using ai_agents config", { agentId: agent.id, agentName: agent.name });
  }

  if (!autopilotConfig) {
    const { data: legacyConfig } = await supabase
      .from("autopilot_config")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .or(`config_scope.eq.workspace,channel.eq.${channel}`)
      .order("config_scope", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (legacyConfig) {
      autopilotConfig = legacyConfig;
      console.log("[WA-AUTOPILOT] Using legacy autopilot_config", { configId: legacyConfig.id });
    }
  }

  if (!autopilotConfig) {
    console.log("[WA-AUTOPILOT] Not enabled for workspace", { workspaceId });
    return;
  }

  // 2. Dedup: check if there's already a trigger for the latest inbound
  const { data: lastTrigger } = await supabase
    .from("autopilot_events")
    .select("id, created_at")
    .eq("conversation_id", conversationId)
    .eq("event_type", "triggered")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTrigger) {
    const { data: newerInbound } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .gt("sent_at", lastTrigger.created_at)
      .limit(1)
      .maybeSingle();

    if (!newerInbound) {
      console.log("[WA-AUTOPILOT] Skipping — last trigger covers latest inbound");
      return;
    }
  }

  // 3. Working hours check
  if (autopilotConfig.respect_working_hours) {
    const isWithinHours = checkWorkingHours(
      autopilotConfig.working_hours_start,
      autopilotConfig.working_hours_end,
      autopilotConfig.working_days,
      autopilotConfig.timezone
    );
    
    if (!isWithinHours) {
      console.log("[WA-AUTOPILOT] Outside working hours");
      if (autopilotConfig.out_of_hours_message) {
        await sendWhatsAppAutopilotMessage(
          supabaseUrl, supabaseServiceKey, workspaceId,
          conversationId, autopilotConfig.out_of_hours_message
        );
      }
      return;
    }
  }

  // 4. Message limits
  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (messageCount && messageCount >= autopilotConfig.max_messages_per_conversation) {
    console.log("[WA-AUTOPILOT] Message limit reached", { count: messageCount });
    await supabase.from("autopilot_events").insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      event_type: "limit_reached",
      event_data: { limit: autopilotConfig.max_messages_per_conversation, count: messageCount }
    });
    return;
  }

  // 5. Sleep on human reply check
  if (autopilotConfig.sleep_on_human_reply) {
    const { data: lastOutbound } = await supabase
      .from("messages")
      .select("sender_id, sent_at")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOutbound?.sender_id) {
      const { data: inboundAfterHuman } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("direction", "inbound")
        .gt("sent_at", lastOutbound.sent_at)
        .limit(1)
        .maybeSingle();

      if (!inboundAfterHuman) {
        console.log("[WA-AUTOPILOT] Human agent replied, sleeping");
        await supabase.from("autopilot_events").insert({
          workspace_id: workspaceId,
          conversation_id: conversationId,
          event_type: "sleeping",
          event_data: { reason: "human_reply", human_id: lastOutbound.sender_id }
        });
        return;
      }
    }
  }

  // 6. Calculate delay
  const delayMin = autopilotConfig.response_delay_min ?? 0;
  const delayMax = autopilotConfig.response_delay_max ?? 0;
  const delaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  // 7. Log trigger
  await supabase.from("autopilot_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    event_type: "triggered",
    event_data: { delay_seconds: delaySeconds, config_id: autopilotConfig.id, channel: "whatsapp" }
  });

  // 8. Wait
  if (delaySeconds > 0) {
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
  }

  // 9. Post-delay race check
  const { data: postDelayMessages } = await supabase
    .from("messages")
    .select("id, direction")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(3);

  if (postDelayMessages?.[0]?.direction === "outbound") {
    console.log("[WA-AUTOPILOT] Skipping — outbound already sent post-delay");
    return;
  }

  // 10. Fetch conversation context
  const { data: messages } = await supabase
    .from("messages")
    .select("content, direction, sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(20);

  if (!messages || messages.length === 0) return;

  const orderedMessages = messages.reverse();

  // Get lead data
  let leadData = null;
  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, email, phone, status, tags")
      .eq("id", leadId)
      .single();
    leadData = lead;
  }

  // 11. Classify intent
  let detectedIntent: { intent: string; confidence: number } | null = null;
  const lastInboundMessage = orderedMessages.filter((m: any) => m.direction === "inbound").pop()?.content || "";
  
  if (lastInboundMessage) {
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const intentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Classifica a intenção da mensagem do cliente. Responde APENAS com JSON válido: {\"intent\": \"sales|support|question|complaint|greeting|other\", \"confidence\": 0.0-1.0}" },
              { role: "user", content: lastInboundMessage }
            ],
            max_tokens: 100,
          }),
        });

        if (intentResponse.ok) {
          const intentData = await intentResponse.json();
          const intentText = intentData.choices?.[0]?.message?.content || "";
          try {
            const cleaned = intentText.replace(/```json\n?|```\n?/g, "").trim();
            detectedIntent = JSON.parse(cleaned);
          } catch { /* silent */ }
        }
      }
    } catch { /* silent */ }
  }

  // Get workspace name
  const { data: ws } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  // 12. Generate AI response
  const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-inbox-reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "suggest_reply",
      messages: orderedMessages.map((m: any) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction
      })),
      leadData,
      channel,
      workspaceId,
      workspaceName: ws?.name || null,
      personaId: autopilotConfig.persona_id,
      useKnowledgeBase: true,
      knowledgeBaseIds: agentSource?.knowledge_base_ids || undefined,
      goalConfig: agentSource?.goal_config || undefined,
      conversationId,
      useConversationalFlows: true,
      detectedIntent
    })
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("[WA-AUTOPILOT] AI generation failed", { error: errorText });
    await supabase.from("autopilot_events").insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      event_type: "error",
      event_data: { error: "ai_generation_failed", details: errorText }
    });
    return;
  }

  const aiResult = await aiResponse.json();
  const suggestion = aiResult.result?.suggestions?.[0]?.text || aiResult.suggestions?.[0]?.text || aiResult.flowResponse;

  if (!suggestion) {
    console.log("[WA-AUTOPILOT] No response generated");
    return;
  }

  // 13. Typing simulation delay
  const typingBaseDelay = 1.5;
  const charsPerSecond = 40;
  const typingDelay = Math.min(8, typingBaseDelay + (suggestion.length / charsPerSecond));
  await new Promise(resolve => setTimeout(resolve, typingDelay * 1000));

  // 14. Send via WhatsApp
  await sendWhatsAppAutopilotMessage(
    supabaseUrl, supabaseServiceKey, workspaceId,
    conversationId, suggestion
  );

  // 15. Log events
  await supabase.from("autopilot_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    event_type: "response_sent",
    event_data: { 
      message_preview: suggestion.substring(0, 100),
      persona_id: autopilotConfig.persona_id,
      channel: "whatsapp"
    }
  });

  await supabase.from("ai_response_audits").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    user_message: lastInboundMessage,
    ai_response: suggestion,
    persona_id: autopilotConfig.persona_id,
    followed_rules: true,
    followed_vibe: true
  });

  try {
    await supabase.from("ai_agent_executions").insert({
      workspace_id: workspaceId,
      agent_type: "autopilot",
      trigger_type: "auto",
      entity_id: conversationId,
      entity_type: "conversation",
      executive_summary: `Autopilot WhatsApp: ${detectedIntent?.intent || "unknown"}`,
      input_summary: { channel: "whatsapp", lead_id: leadId, message_count: messages?.length || 0 },
      output: { response_preview: suggestion.substring(0, 200), persona_id: autopilotConfig.persona_id },
      reasoning_trace: { intent: detectedIntent, knowledge_used: true }
    });
  } catch { /* silent */ }

  console.log("[WA-AUTOPILOT] Response sent successfully");
}

async function sendWhatsAppAutopilotMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  workspaceId: string,
  conversationId: string,
  message: string
): Promise<void> {
  const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      message,
      is_autopilot: true
    })
  });

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    console.error("[WA-AUTOPILOT] Send failed", { error: errorText });
    throw new Error(`WhatsApp send failed: ${errorText}`);
  }
}

function checkWorkingHours(
  startTime: string | null,
  endTime: string | null,
  workingDays: number[] | null,
  timezone: string | null
): boolean {
  if (!startTime || !endTime) return true;
  try {
    const now = new Date();
    const tz = timezone || "Europe/Lisbon";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short"
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const dayOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(
      parts.find(p => p.type === "weekday")?.value || "Mon"
    );
    if (workingDays?.length && !workingDays.includes(dayOfWeek)) return false;
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const current = hour * 60 + minute;
    return current >= startHour * 60 + startMin && current <= endHour * 60 + endMin;
  } catch {
    return true;
  }
}
