import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ghl-location-id",
};

// Supports multiple GHL payload formats (workflow triggers, webhooks, etc.)
interface GHLMessagePayload {
  // Common identifiers
  type?: string;
  event_type?: string;
  
  // Location identification
  locationId?: string;
  location_id?: string;
  location?: {
    id?: string;
    name?: string;
  };
  
  // Message data (workflow format - snake_case at root)
  message_id?: string;
  contact_id?: string;
  message_body?: string;
  message_type?: string;
  message_direction?: string;
  message_status?: string;
  date_added?: string;
  
  // Message data (webhook format - camelCase at root)
  messageId?: string;
  contactId?: string;
  body?: string;
  messageType?: string;
  direction?: string;
  status?: string;
  dateAdded?: string;
  
  // Nested format (original GHL webhook structure)
  message?: {
    id?: string;
    body?: string;
    type?: string;
    channel?: string;
    direction?: string;
    status?: string;
    dateAdded?: string;
    sent_at?: string;
    contact_id?: string;
    contactId?: string;
    attachments?: Array<{
      url?: string;
      type?: string;
      name?: string;
    }>;
  };
  
  contact?: {
    id?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  
  // Attachments at root
  attachments?: Array<{
    url?: string;
    type?: string;
    name?: string;
  }>;
  
  // Channel/conversation info
  channel?: string;
  conversationId?: string;
  conversation_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL to get query params
    const url = new URL(req.url);
    const queryLocationId = url.searchParams.get("location_id");

    // Parse body
    const body: GHLMessagePayload = await req.json();
    
    // Log full payload for debugging
    console.log("[GHL-MESSAGE] Full payload received", JSON.stringify(body));
    
    // Get location ID from: query param > header > body > location object
    const locationId = queryLocationId ||
                       req.headers.get("X-GHL-Location-Id") || 
                       body.location_id || 
                       body.locationId ||
                       body.location?.id;

    // Extract message content FIRST - this determines if it's a message webhook
    const messageBody = body.message_body || body.body || body.message?.body;
    
    // Log what type of payload we received
    const hasMessage = Boolean(messageBody);
    const payloadType = hasMessage ? "message" : "contact_only";
    
    console.log("[GHL-MESSAGE] Payload analysis", { 
      payloadType,
      hasMessageBody: hasMessage,
      hasMessageObject: Boolean(body.message),
      locationId 
    });
    
    // If this is a contact-only trigger (no message), respond gracefully
    if (!hasMessage) {
      console.log("[GHL-MESSAGE] Contact trigger received (no message content) - skipping");
      return new Response(
        JSON.stringify({ 
          message: "Contact trigger received - no message to sync",
          hint: "Configure your GHL workflow/webhook to trigger on 'InboundMessage' event for message sync"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract message ID - support workflow format, webhook format, and nested format
    // For workflows that don't send a message ID, generate one based on contact + timestamp
    let ghlMessageId = body.message_id || body.messageId || body.message?.id;
    
    // Generate unique ID for workflow-based messages without an ID
    if (!ghlMessageId) {
      const timestamp = Date.now();
      const contactIdForKey = body.contact_id || body.contactId || body.contact?.id || "unknown";
      ghlMessageId = `ghl_wf_${contactIdForKey}_${timestamp}`;
      console.log("[GHL-MESSAGE] Generated message ID for workflow", { ghlMessageId });
    }
    
    // Extract contact ID - support multiple formats
    const ghlContactId = body.contact_id || body.contactId || body.contact?.id || body.message?.contact_id || body.message?.contactId;

    // Extract conversation ID
    const ghlConversationId = body.conversation_id || body.conversationId;

    console.log("[GHL-MESSAGE] Processing message", { 
      locationId, 
      messageId: ghlMessageId,
      contactId: ghlContactId,
      conversationId: ghlConversationId,
      messagePreview: messageBody?.substring(0, 50)
    });

    if (!locationId) {
      console.error("[GHL-MESSAGE] Missing location_id");
      return new Response(
        JSON.stringify({ error: "Missing location_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ghlContactId) {
      console.error("[GHL-MESSAGE] Missing contact ID in payload");
      return new Response(
        JSON.stringify({ error: "Missing contact ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find workspace by location_id (get first match if multiple exist)
    const { data: configs, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id, sync_messages")
      .eq("ghl_location_id", locationId)
      .eq("is_active", true)
      .limit(1);
    
    const config = configs?.[0] || null;

    if (configError) {
      console.error("[GHL-MESSAGE] Config lookup error", configError);
      return new Response(
        JSON.stringify({ error: "Config lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config) {
      console.log("[GHL-MESSAGE] No active config for location", locationId);
      return new Response(
        JSON.stringify({ message: "Location not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.sync_messages) {
      console.log("[GHL-MESSAGE] Message sync disabled for workspace");
      return new Response(
        JSON.stringify({ message: "Message sync disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = config.workspace_id;

    // Fetch workspace name for AI context (prevents cross-workspace confusion)
    let workspaceName: string | null = null;
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();
    
    if (workspace) {
      workspaceName = workspace.name;
      console.log("[GHL-MESSAGE] Workspace context", { workspaceId, workspaceName });
    }

    // 2. Check idempotency - have we already processed this message?
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id")
      .eq("ghl_message_id", ghlMessageId)
      .maybeSingle();

    if (existingMessage) {
      console.log("[GHL-MESSAGE] Message already exists", { ghlMessageId });
      return new Response(
        JSON.stringify({ message: "Message already synced", message_id: existingMessage.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find the lead/contact by GHL contact ID
    let leadId: string | null = null;
    let contactId: string | null = null;

    // Try to find lead first
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("ghl_contact_id", ghlContactId)
      .maybeSingle();

    if (lead) {
      leadId = lead.id;
    } else {
      // Try contacts
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("ghl_contact_id", ghlContactId)
        .maybeSingle();

      if (contact) {
        contactId = contact.id;
      }
    }

    if (!leadId && !contactId) {
      console.log("[GHL-MESSAGE] No matching lead/contact for GHL contact", { ghlContactId });
      // Return 200 to prevent webhook retry - contact may not be synced yet
      return new Response(
        JSON.stringify({ message: "Lead/contact not found for contact" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Normalize message fields - support all formats
    const messageContent = body.message_body || body.body || body.message?.body || "";
    const rawDirection = body.message_direction || body.direction || body.message?.direction || "inbound";
    const messageDirection = normalizeDirection(rawDirection);
    
    // Channel detection: GHL uses numeric type codes OR string channels
    // Also check contact.attributionSource.medium for the actual source platform
    const messageTypeCode = body.message?.type;
    const attributionMedium = (body.contact as any)?.attributionSource?.medium || 
                              (body.contact as any)?.lastAttributionSource?.medium;
    const rawChannel = body.channel || body.message_type || body.messageType || body.message?.channel || "sms";
    const channel = resolveGHLChannel(messageTypeCode, rawChannel, attributionMedium);
    
    const messageSentAt = body.date_added || body.dateAdded || body.message?.sent_at || body.message?.dateAdded || new Date().toISOString();
    const messageStatus = body.message_status || body.status || body.message?.status || "pending";
    
    // Handle attachments
    const attachments = body.attachments || body.message?.attachments || [];
    const formattedAttachments = attachments.map(att => ({
      url: att.url,
      type: att.type || "file",
      name: att.name || "attachment"
    }));

    console.log("[GHL-MESSAGE] Normalized message data", { 
      ghlMessageId, 
      messageContent: messageContent.substring(0, 50), 
      messageDirection,
      channel,
      attachments: formattedAttachments.length 
    });

    // 5. Find or create conversation
    const externalThreadId = ghlConversationId ? `ghl_${ghlConversationId}` : `ghl_${ghlContactId}_${channel}`;
    
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id, unread_count")
      .eq("workspace_id", workspaceId)
      .eq("external_thread_id", externalThreadId)
      .maybeSingle();

    if (!conversation) {
      // Try to find by lead/contact + channel
      const query = supabase
        .from("conversations")
        .select("id, unread_count")
        .eq("workspace_id", workspaceId)
        .eq("channel", channel);
      
      if (leadId) {
        query.eq("lead_id", leadId);
      } else if (contactId) {
        query.eq("contact_id", contactId);
      }

      const { data: existingConv } = await query.maybeSingle();
      conversation = existingConv;
    }

    let conversationId: string;

    if (conversation) {
      conversationId = conversation.id;
    } else {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          contact_id: contactId,
          channel: channel,
          status: "open",
          unread_count: messageDirection === "inbound" ? 1 : 0,
          external_thread_id: externalThreadId,
          channel_metadata: {
            ghl_conversation_id: ghlConversationId,
            ghl_contact_id: ghlContactId,
            source: "ghl"
          }
        })
        .select("id, unread_count")
        .single();

      if (convError || !newConversation) {
        console.error("[GHL-MESSAGE] Conversation creation error", convError);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversation = newConversation;
      conversationId = newConversation.id;
      console.log("[GHL-MESSAGE] Created new conversation", { conversationId });
    }

    // 6. Create the message (using only valid columns)
    const { data: newMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        content: messageContent,
        direction: messageDirection,
        sent_at: messageSentAt,
        ghl_message_id: ghlMessageId,
        external_message_id: ghlMessageId,
        attachments: formattedAttachments.length > 0 ? formattedAttachments : null
      })
      .select("id")
      .single();

    if (msgError || !newMessage) {
      console.error("[GHL-MESSAGE] Message creation error", msgError);
      return new Response(
        JSON.stringify({ error: "Failed to create message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[GHL-MESSAGE] Created new message", { messageId: newMessage.id });

    // 7. Update conversation with last message info
    const isInbound = messageDirection === "inbound";
    const updateData: Record<string, unknown> = {
      last_message_at: messageSentAt,
      last_message_preview: messageContent.substring(0, 100),
      updated_at: new Date().toISOString()
    };
    
    if (isInbound) {
      // Increment unread count for inbound messages
      updateData.unread_count = (conversation?.unread_count || 0) + 1;
      updateData.status = "open"; // Re-open if closed
    }

    await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId);

    // 8. Update lead's last_contact_at
    if (leadId) {
      await supabase
        .from("leads")
        .update({ last_contact_at: messageSentAt })
        .eq("id", leadId);
    }

    // 9. Log sync event
    await supabase
      .from("ghl_sync_log")
      .insert({
        workspace_id: workspaceId,
        ghl_entity_type: "message",
        ghl_entity_id: ghlMessageId,
        fastcrm_entity_type: "message",
        fastcrm_entity_id: newMessage.id,
        event_type: "created",
        payload: body
      });

    // 10. Update last_sync_at on config
    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    // 11. AUTO-PILOT: Trigger automatic response for inbound messages
    if (isInbound) {
      triggerAutopilotResponse(supabase, supabaseUrl, supabaseServiceKey, {
        workspaceId,
        workspaceName,
        conversationId,
        messageId: newMessage.id,
        channel,
        leadId,
        contactId,
        ghlContactId,
        locationId
      }).catch(err => {
        console.error("[GHL-MESSAGE] Autopilot trigger error (non-blocking)", err);
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: newMessage.id,
        conversation_id: conversationId,
        lead_id: leadId,
        contact_id: contactId,
        autopilot_triggered: isInbound
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GHL-MESSAGE] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// GHL message type numeric codes
// Reference: https://highlevel.stoplight.io/docs/integrations/reference/conversations.v1.yaml
const GHL_TYPE_CODES: Record<number, string> = {
  1: "sms",           // TYPE_SMS
  2: "email",         // TYPE_EMAIL
  3: "sms",           // TYPE_CUSTOM_SMS
  4: "email",         // TYPE_CUSTOM_EMAIL
  5: "messenger",     // TYPE_FB_MESSENGER
  6: "messenger",     // TYPE_GMB
  7: "chat",          // TYPE_LIVE_CHAT
  8: "chat",          // TYPE_WEBCHAT
  9: "whatsapp",      // TYPE_WHATSAPP
  10: "call",         // TYPE_CALL
  11: "messenger",    // TYPE_FB (Facebook page message)
  12: "google",       // TYPE_GMB (Google My Business)
  13: "review",       // TYPE_REVIEW
  14: "sms",          // TYPE_TWILIO_SMS
  15: "whatsapp",     // TYPE_TWILIO_WHATSAPP
  16: "whatsapp",     // TYPE_WHATSAPP_API
  17: "instagram",    // TYPE_INSTAGRAM (IG Comment/Story)
  18: "instagram",    // TYPE_INSTAGRAM_DM
  19: "messenger",    // TYPE_FACEBOOK_MESSENGER
  20: "call",         // TYPE_VOICEMAIL
};

// Resolve channel from multiple GHL payload sources
function resolveGHLChannel(
  typeCode: number | string | undefined,
  rawChannel: string,
  attributionMedium?: string
): string {
  // 1. First try numeric type code (most reliable for message type)
  if (typeof typeCode === "number" && GHL_TYPE_CODES[typeCode]) {
    console.log("[GHL-MESSAGE] Channel resolved from type code", { typeCode, channel: GHL_TYPE_CODES[typeCode] });
    return GHL_TYPE_CODES[typeCode];
  }
  
  // 2. Check attribution medium (indicates source platform)
  if (attributionMedium) {
    const medium = attributionMedium.toLowerCase();
    if (medium === "instagram" || medium.includes("ig")) {
      console.log("[GHL-MESSAGE] Channel resolved from attribution", { attributionMedium, channel: "instagram" });
      return "instagram";
    }
    if (medium === "facebook" || medium.includes("fb")) {
      console.log("[GHL-MESSAGE] Channel resolved from attribution", { attributionMedium, channel: "messenger" });
      return "messenger";
    }
  }
  
  // 3. Fall back to string channel mapping
  return mapGHLChannel(rawChannel);
}

// Helper to normalize channel names from string values
function mapGHLChannel(channel: string | number): string {
  // Handle numeric codes passed as string
  if (typeof channel === "number" || !isNaN(Number(channel))) {
    const code = Number(channel);
    if (GHL_TYPE_CODES[code]) {
      return GHL_TYPE_CODES[code];
    }
  }
  
  const channelStr = String(channel).toLowerCase();
  const channelMap: Record<string, string> = {
    "sms": "sms",
    "email": "email",
    "whatsapp": "whatsapp",
    "facebook": "messenger",
    "fb": "messenger",
    "messenger": "messenger",
    "instagram": "instagram",
    "ig": "instagram",
    "live_chat": "chat",
    "livechat": "chat",
    "chat": "chat",
    "webchat": "chat",
    "gmb": "google",
    "google": "google",
    "call": "call",
    "voicemail": "call"
  };
  
  return channelMap[channelStr] || "sms";
}

// Helper to normalize direction
function normalizeDirection(direction: string): string {
  const lowerDir = direction.toLowerCase();
  const directionMap: Record<string, string> = {
    "inbound": "inbound",
    "incoming": "inbound",
    "received": "inbound",
    "in": "inbound",
    "outbound": "outbound",
    "outgoing": "outbound",
    "sent": "outbound",
    "out": "outbound"
  };
  
  return directionMap[lowerDir] || "inbound";
}

// ============================================================
// AUTOPILOT: Automatic AI response for inbound messages
// ============================================================

interface AutopilotParams {
  workspaceId: string;
  workspaceName: string | null;
  conversationId: string;
  messageId: string;
  channel: string;
  leadId: string | null;
  contactId: string | null;
  ghlContactId: string;
  locationId: string;
}

async function triggerAutopilotResponse(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: AutopilotParams
): Promise<void> {
  const { workspaceId, workspaceName, conversationId, channel, leadId, ghlContactId, locationId } = params;

  console.log("[AUTOPILOT] Checking autopilot config for workspace", { workspaceId, conversationId });

  // 1. Check if autopilot is enabled for this workspace
  const { data: autopilotConfig } = await supabase
    .from("autopilot_config")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .or(`config_scope.eq.workspace,channel.eq.${channel}`)
    .order("config_scope", { ascending: false }) // channel-specific first
    .limit(1)
    .maybeSingle();

  if (!autopilotConfig) {
    console.log("[AUTOPILOT] Autopilot not enabled for workspace", { workspaceId });
    return;
  }

  console.log("[AUTOPILOT] Autopilot is active", { 
    configId: autopilotConfig.id,
    scope: autopilotConfig.config_scope,
    delayMin: autopilotConfig.response_delay_min,
    delayMax: autopilotConfig.response_delay_max
  });

  // 2. Check if we're within working hours (if configured)
  if (autopilotConfig.respect_working_hours) {
    const isWithinHours = checkWorkingHours(
      autopilotConfig.working_hours_start,
      autopilotConfig.working_hours_end,
      autopilotConfig.working_days,
      autopilotConfig.timezone
    );
    
    if (!isWithinHours) {
      console.log("[AUTOPILOT] Outside working hours, skipping auto-reply");
      
      // Optionally send out-of-hours message
      if (autopilotConfig.out_of_hours_message) {
        await sendAutopilotMessage(
          supabaseUrl,
          supabaseServiceKey,
          workspaceId,
          conversationId,
          autopilotConfig.out_of_hours_message,
          ghlContactId,
          locationId,
          channel
        );
      }
      return;
    }
  }

  // 3. Check message limits
  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

  if (messageCount && messageCount >= autopilotConfig.max_messages_per_conversation) {
    console.log("[AUTOPILOT] Message limit reached", { 
      count: messageCount, 
      limit: autopilotConfig.max_messages_per_conversation 
    });
    
    // Log autopilot event
    await supabase.from("autopilot_events").insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      event_type: "limit_reached",
      event_data: { limit: autopilotConfig.max_messages_per_conversation, count: messageCount }
    });
    return;
  }

  // 4. Check if last message was from a human agent (sleep on human reply)
  if (autopilotConfig.sleep_on_human_reply) {
    const { data: lastOutbound } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOutbound?.sender_id) {
      console.log("[AUTOPILOT] Human agent replied, sleeping autopilot", { senderId: lastOutbound.sender_id });
      
      await supabase.from("autopilot_events").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        event_type: "sleeping",
        event_data: { reason: "human_reply", human_id: lastOutbound.sender_id }
      });
      return;
    }
  }

  // 5. Calculate response delay
  const delayMin = autopilotConfig.response_delay_min || 5;
  const delayMax = autopilotConfig.response_delay_max || 10;
  const delaySeconds = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;

  console.log("[AUTOPILOT] Scheduling response", { delaySeconds });

  // 6. Log autopilot activation
  await supabase.from("autopilot_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    event_type: "triggered",
    event_data: { delay_seconds: delaySeconds, config_id: autopilotConfig.id }
  });

  // 7. Wait for delay (simulates human-like response time)
  await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

  // 8. Fetch conversation messages for context
  const { data: messages } = await supabase
    .from("messages")
    .select("content, direction, sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true })
    .limit(20);

  if (!messages || messages.length === 0) {
    console.log("[AUTOPILOT] No messages found for context");
    return;
  }

  // 9. Get lead data for personalization
  let leadData = null;
  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, email, phone, status, tags")
      .eq("id", leadId)
      .single();
    leadData = lead;
  }

  // 10. Generate AI response
  console.log("[AUTOPILOT] Generating AI response");

  const aiResponse = await fetch(`${supabaseUrl}/functions/v1/ai-inbox-reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "suggest_reply",
      messages: messages.map((m: any) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction
      })),
      leadData,
      channel,
      workspaceId,
      workspaceName, // NEW: Pass workspace name for context when no persona/knowledge
      personaId: autopilotConfig.persona_id,
      useKnowledgeBase: true,
      conversationId,
      useConversationalFlows: true
    })
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("[AUTOPILOT] AI response generation failed", { status: aiResponse.status, error: errorText });
    
    await supabase.from("autopilot_events").insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      event_type: "error",
      event_data: { error: "ai_generation_failed", details: errorText }
    });
    return;
  }

  const aiResult = await aiResponse.json();
  
  // Get the first suggestion - note: result is nested under aiResult.result
  const suggestion = aiResult.result?.suggestions?.[0]?.text || aiResult.suggestions?.[0]?.text || aiResult.flowResponse;

  if (!suggestion) {
    console.log("[AUTOPILOT] No response generated", { aiResult: JSON.stringify(aiResult).substring(0, 200) });
    return;
  }

  console.log("[AUTOPILOT] AI generated response", { preview: suggestion.substring(0, 100) });

  // 11. Send the response via GHL
  await sendAutopilotMessage(
    supabaseUrl,
    supabaseServiceKey,
    workspaceId,
    conversationId,
    suggestion,
    ghlContactId,
    locationId,
    channel
  );

  // 12. Log autopilot event for UI activity feed
  await supabase.from("autopilot_events").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    event_type: "response_sent",
    event_data: { 
      message_preview: suggestion.substring(0, 100),
      persona_id: autopilotConfig.persona_id,
      channel
    }
  });

  // 13. Log audit trail
  await supabase.from("ai_response_audits").insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    user_message: messages.filter((m: any) => m.direction === "inbound").pop()?.content || "",
    ai_response: suggestion,
    persona_id: autopilotConfig.persona_id,
    followed_rules: true,
    followed_vibe: true
  });

  console.log("[AUTOPILOT] Response sent successfully");
}

async function sendAutopilotMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  workspaceId: string,
  conversationId: string,
  message: string,
  ghlContactId: string,
  locationId: string,
  channel: string
): Promise<void> {
  // Call ghl-send-message to deliver the message
  const sendResponse = await fetch(`${supabaseUrl}/functions/v1/ghl-send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      conversationId: conversationId, // Use camelCase to match ghl-send-message interface
      message,
      channel,
      // Include GHL IDs for direct routing if available
      ghlContactId,
      locationId,
      is_autopilot: true
    })
  });

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    console.error("[AUTOPILOT] Failed to send message via GHL", { error: errorText });
    throw new Error(`GHL send failed: ${errorText}`);
  }

  console.log("[AUTOPILOT] Message delivered via GHL");
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
    
    // Get current time in the configured timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short"
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      parts.find(p => p.type === "weekday")?.value || "Mon"
    );

    // Check day of week
    if (workingDays && workingDays.length > 0 && !workingDays.includes(dayOfWeek)) {
      return false;
    }

    // Parse start/end times
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (e) {
    console.error("[AUTOPILOT] Error checking working hours", e);
    return true; // Default to allowing if there's an error
  }
}
