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
    const rawChannel = body.channel || body.message_type || body.messageType || body.message?.channel || body.message?.type || "sms";
    const channel = mapGHLChannel(rawChannel);
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: newMessage.id,
        conversation_id: conversationId,
        lead_id: leadId,
        contact_id: contactId
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

// Helper to normalize channel names
function mapGHLChannel(channel: string): string {
  const channelMap: Record<string, string> = {
    "sms": "sms",
    "SMS": "sms",
    "email": "email",
    "Email": "email",
    "whatsapp": "whatsapp",
    "WhatsApp": "whatsapp",
    "facebook": "messenger",
    "Facebook": "messenger",
    "messenger": "messenger",
    "Messenger": "messenger",
    "instagram": "instagram",
    "Instagram": "instagram",
    "live_chat": "chat",
    "LiveChat": "chat",
    "chat": "chat",
    "webchat": "chat",
    "gmb": "google",
    "GMB": "google",
    "google": "google",
    "call": "call",
    "voicemail": "call"
  };
  
  return channelMap[channel] || "sms";
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
