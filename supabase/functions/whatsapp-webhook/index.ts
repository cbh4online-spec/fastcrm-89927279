import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const WEBHOOK_VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "fastcrm_whatsapp_verify";

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  // Process incoming messages (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("WhatsApp webhook received:", JSON.stringify(body, null, 2));

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // WhatsApp Cloud API webhook format
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;

          const value = change.value;
          const phoneNumberId = value?.metadata?.phone_number_id;

          if (!phoneNumberId) continue;

          // Find workspace with this phone number
          const { data: connection, error: connError } = await supabase
            .from("whatsapp_connections")
            .select("workspace_id")
            .eq("phone_number_id", phoneNumberId)
            .eq("is_active", true)
            .single();

          if (connError || !connection) {
            console.log("No active connection for phone_number_id:", phoneNumberId);
            continue;
          }

          const workspaceId = connection.workspace_id;

          // Process each message
          for (const msg of value.messages || []) {
            const senderId = msg.from; // sender's WhatsApp number
            const messageText = msg.text?.body || "";
            const timestamp = msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString();

            const externalThreadId = `whatsapp_${senderId}_${phoneNumberId}`;

            // Find or create conversation
            let conversationId: string;

            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("external_thread_id", externalThreadId)
              .single();

            if (existingConv) {
              conversationId = existingConv.id;

              const messagePreview = messageText.substring(0, 100);
              await supabase
                .from("conversations")
                .update({
                  last_message_at: timestamp,
                  last_message_preview: messagePreview,
                  status: "open",
                })
                .eq("id", conversationId);
            } else {
              const messagePreview = messageText.substring(0, 100);
              const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                  workspace_id: workspaceId,
                  channel: "whatsapp",
                  external_thread_id: externalThreadId,
                  status: "open",
                  unread_count: 1,
                  last_message_at: timestamp,
                  last_message_preview: messagePreview,
                  channel_metadata: {
                    whatsapp_sender: senderId,
                    whatsapp_phone_number_id: phoneNumberId,
                  },
                })
                .select("id")
                .single();

              if (convError) {
                console.error("Failed to create conversation:", convError);
                continue;
              }
              conversationId = newConv.id;
            }

            // Build attachments
            const attachments: any[] = [];
            if (msg.type === "image" && msg.image) {
              attachments.push({ type: "image", media_id: msg.image.id });
            } else if (msg.type === "document" && msg.document) {
              attachments.push({ type: "document", media_id: msg.document.id });
            } else if (msg.type === "audio" && msg.audio) {
              attachments.push({ type: "audio", media_id: msg.audio.id });
            } else if (msg.type === "video" && msg.video) {
              attachments.push({ type: "video", media_id: msg.video.id });
            }

            // Save message
            const { error: msgError } = await supabase.from("messages").insert({
              conversation_id: conversationId,
              workspace_id: workspaceId,
              direction: "inbound",
              content: messageText,
              attachments: attachments.length > 0 ? attachments : null,
              sent_at: timestamp,
            });

            if (msgError) {
              console.error("Failed to save message:", msgError);
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
