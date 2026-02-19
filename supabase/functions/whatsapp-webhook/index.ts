import { createClient } from "@supabase/supabase-js";
import { normalizeIncomingMessage } from "../_shared/normalize-message.ts";

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

          // Process each message via normalize layer
          for (const msg of value.messages || []) {
            const senderId = msg.from;
            const messageText = msg.text?.body || "";
            const timestamp = msg.timestamp
              ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

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

            const externalThreadId = `whatsapp_${senderId}_${phoneNumberId}`;
            const externalMessageId = msg.id || undefined;

            try {
              const result = await normalizeIncomingMessage(supabase, {
                workspace_id: workspaceId,
                channel: "whatsapp",
                sender_id: senderId,
                sender_phone: senderId,
                content: messageText,
                attachments,
                external_thread_id: externalThreadId,
                external_message_id: externalMessageId,
                timestamp,
                channel_metadata: {
                  whatsapp_sender: senderId,
                  whatsapp_phone_number_id: phoneNumberId,
                },
              });

              console.log("[whatsapp] Message processed:", result);

              // Fire-and-forget: compute conversation signals
              if (result?.contact_id || result?.lead_id) {
                (async () => {
                  try {
                    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-conversation-signals`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                      },
                      body: JSON.stringify({
                        workspace_id: workspaceId,
                        contact_id: result.contact_id || null,
                        lead_id: result.lead_id || null,
                      }),
                    });
                  } catch { /* silent */ }
                })();
              }
            } catch (err) {
              console.error("[whatsapp] Failed to process message:", err);
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
