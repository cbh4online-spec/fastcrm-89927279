import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ghl-location-id",
};

interface GHLMessage {
  id: string;
  contact_id?: string;
  contactId?: string;
  direction?: "inbound" | "outbound";
  channel?: string;
  type?: string;
  body?: string;
  status?: string;
  sent_at?: string;
  dateAdded?: string;
}

interface GHLMessagePayload {
  event_type?: string;
  location_id?: string;
  locationId?: string;
  conversation_id?: string;
  conversationId?: string;
  message: GHLMessage;
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

    // Parse body
    const body: GHLMessagePayload = await req.json();
    
    // Get location ID from header or body
    const locationId = req.headers.get("X-GHL-Location-Id") || 
                       body.location_id || 
                       body.locationId;

    console.log("[GHL-MESSAGE] Received webhook", { 
      locationId, 
      messageId: body.message?.id,
      conversationId: body.conversation_id || body.conversationId 
    });

    if (!locationId) {
      console.error("[GHL-MESSAGE] Missing location_id");
      return new Response(
        JSON.stringify({ error: "Missing location_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.message?.id) {
      console.error("[GHL-MESSAGE] Missing message data");
      return new Response(
        JSON.stringify({ error: "Missing message data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find workspace by location_id
    const { data: config, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id, sync_messages")
      .eq("ghl_location_id", locationId)
      .eq("is_active", true)
      .maybeSingle();

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
    const message = body.message;
    const ghlMessageId = message.id;
    const ghlConversationId = body.conversation_id || body.conversationId || `ghl_${message.contact_id || message.contactId}`;
    const ghlContactId = message.contact_id || message.contactId;

    // 2. Check idempotency
    const { data: existingSync } = await supabase
      .from("ghl_sync_log")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("ghl_entity_type", "message")
      .eq("ghl_entity_id", ghlMessageId)
      .maybeSingle();

    if (existingSync) {
      console.log("[GHL-MESSAGE] Message already processed", { ghlMessageId });
      return new Response(
        JSON.stringify({ message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find lead/contact by ghl_contact_id
    let leadId: string | null = null;
    let contactId: string | null = null;

    if (ghlContactId) {
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
    }

    // 4. Find or create conversation
    const externalThreadId = `ghl_${ghlConversationId}`;
    
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("external_thread_id", externalThreadId)
      .maybeSingle();

    if (!conversation) {
      // Create new conversation
      const channelType = mapGHLChannel(message.channel || message.type);
      
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          contact_id: contactId,
          channel: channelType,
          external_thread_id: externalThreadId,
          status: "open",
          is_read: false,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        console.error("[GHL-MESSAGE] Conversation creation error", convError);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversation = newConv;
      console.log("[GHL-MESSAGE] Created conversation", { conversationId: conversation.id });
    }

    // 5. Create message
    const direction = message.direction === "outbound" ? "outbound" : "inbound";
    const sentAt = message.sent_at || message.dateAdded || new Date().toISOString();

    const { data: newMessage, error: msgError } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversation.id,
        content: message.body || "",
        direction,
        channel: mapGHLChannel(message.channel || message.type),
        status: mapGHLStatus(message.status),
        ghl_message_id: ghlMessageId,
        created_at: sentAt,
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

    // 6. Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({
        last_message_at: sentAt,
        is_read: direction === "outbound",
        status: "open",
      })
      .eq("id", conversation.id);

    // 7. Log sync
    const { error: logError } = await supabase
      .from("ghl_sync_log")
      .insert({
        workspace_id: workspaceId,
        ghl_entity_type: "message",
        ghl_entity_id: ghlMessageId,
        fastcrm_entity_type: "message",
        fastcrm_entity_id: newMessage.id,
        event_type: "created",
        payload: body,
      });

    if (logError) {
      console.error("[GHL-MESSAGE] Sync log error", logError);
    }

    // Update last_sync_at on config
    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    console.log("[GHL-MESSAGE] Created message", { messageId: newMessage.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: newMessage.id,
        conversation_id: conversation.id
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

function mapGHLChannel(ghlChannel?: string): string {
  if (!ghlChannel) return "other";
  
  const channelMap: Record<string, string> = {
    sms: "sms",
    email: "email",
    whatsapp: "whatsapp",
    facebook: "messenger",
    instagram: "instagram",
    call: "call",
    voicemail: "call",
    live_chat: "chat",
    webchat: "chat",
  };

  return channelMap[ghlChannel.toLowerCase()] || "other";
}

function mapGHLStatus(ghlStatus?: string): string {
  if (!ghlStatus) return "pending";
  
  const statusMap: Record<string, string> = {
    delivered: "delivered",
    sent: "sent",
    read: "read",
    failed: "failed",
    pending: "pending",
  };

  return statusMap[ghlStatus.toLowerCase()] || "pending";
}
