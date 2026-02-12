import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message } = await req.json();

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing conversationId or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("channel", "whatsapp")
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found or not a WhatsApp conversation" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("workspace_id", conversation.workspace_id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active WhatsApp connection for this workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient from metadata
    const channelMetadata = conversation.channel_metadata as any;
    const recipientPhone = channelMetadata?.whatsapp_sender;

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({ error: "Cannot determine recipient phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${connection.access_token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save outbound message
    let senderId = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      senderId = user?.id;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      workspace_id: conversation.workspace_id,
      direction: "outbound",
      content: message,
      sender_id: senderId,
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.messages?.[0]?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
