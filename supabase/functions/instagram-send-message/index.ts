import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*, instagram_connections!inner(*)")
      .eq("id", conversationId)
      .eq("channel", "instagram")
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found or not an Instagram conversation" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Instagram connection for this workspace
    const { data: connection, error: connError } = await supabase
      .from("instagram_connections")
      .select("*")
      .eq("workspace_id", conversation.workspace_id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Instagram connection for this workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient ID from channel_metadata
    const channelMetadata = conversation.channel_metadata as any;
    const recipientId = channelMetadata?.instagram_sender_id;

    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: "Cannot determine recipient" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send message via Instagram Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.page_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: connection.access_token,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Instagram API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Save outbound message to database
    const authHeader = req.headers.get("Authorization");
    let senderId = null;
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

    // Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ success: true, messageId: result.message_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
