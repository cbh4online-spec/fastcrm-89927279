import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const WEBHOOK_VERIFY_TOKEN = Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN") || "fastcrm_instagram_verify";

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("Webhook verification failed");
      return new Response("Forbidden", { status: 403 });
    }
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle incoming messages (POST request)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body, null, 2));

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Process each entry
      for (const entry of body.entry || []) {
        const instagramId = entry.id;

        // Find the workspace with this Instagram connection
        const { data: connection, error: connectionError } = await supabase
          .from("instagram_connections")
          .select("workspace_id")
          .eq("instagram_user_id", instagramId)
          .eq("is_active", true)
          .single();

        if (connectionError || !connection) {
          console.log("No active connection found for Instagram ID:", instagramId);
          continue;
        }

        const workspaceId = connection.workspace_id;

        // Process messaging events
        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const message = messagingEvent.message;
          const timestamp = messagingEvent.timestamp;

          if (!message || !senderId) continue;

          // Skip echo messages (messages we sent)
          if (message.is_echo) continue;

          // Find or create conversation
          let conversationId: string;
          const externalThreadId = `instagram_${senderId}_${recipientId}`;

          const { data: existingConversation } = await supabase
            .from("conversations")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("external_thread_id", externalThreadId)
            .single();

          if (existingConversation) {
            conversationId = existingConversation.id;

            // Update conversation
            await supabase
              .from("conversations")
              .update({
                last_message_at: new Date(timestamp).toISOString(),
                unread_count: supabase.rpc("increment_unread", { row_id: conversationId }),
                status: "open",
              })
              .eq("id", conversationId);
          } else {
            // Try to find/create lead for this sender
            let leadId = null;

            // Create new conversation
            const { data: newConversation, error: convError } = await supabase
              .from("conversations")
              .insert({
                workspace_id: workspaceId,
                channel: "instagram",
                external_thread_id: externalThreadId,
                status: "open",
                unread_count: 1,
                last_message_at: new Date(timestamp).toISOString(),
                lead_id: leadId,
                channel_metadata: {
                  instagram_sender_id: senderId,
                  instagram_recipient_id: recipientId,
                },
              })
              .select("id")
              .single();

            if (convError) {
              console.error("Failed to create conversation:", convError);
              continue;
            }

            conversationId = newConversation.id;
          }

          // Create message
          const attachments: any[] = [];
          if (message.attachments) {
            for (const att of message.attachments) {
              attachments.push({
                type: att.type,
                url: att.payload?.url,
              });
            }
          }

          const { error: msgError } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            workspace_id: workspaceId,
            direction: "inbound",
            content: message.text || "",
            attachments: attachments,
            sent_at: new Date(timestamp).toISOString(),
          });

          if (msgError) {
            console.error("Failed to save message:", msgError);
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Still return 200 to prevent Meta from retrying
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
