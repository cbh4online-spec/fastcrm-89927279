import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeIncomingMessage } from "../_shared/normalize-message.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

        // Process messaging events via normalize layer
        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const message = messagingEvent.message;
          const timestamp = messagingEvent.timestamp;

          if (!message || !senderId) continue;

          // Skip echo messages (messages we sent)
          if (message.is_echo) continue;

          const externalThreadId = `instagram_${senderId}_${recipientId}`;
          const externalMessageId = message.mid || undefined;

          // Build attachments
          const attachments: any[] = [];
          if (message.attachments) {
            for (const att of message.attachments) {
              attachments.push({
                type: att.type,
                url: att.payload?.url,
              });
            }
          }

          try {
            const result = await normalizeIncomingMessage(supabase, {
              workspace_id: workspaceId,
              channel: "instagram",
              sender_id: senderId,
              content: message.text || "",
              attachments,
              external_thread_id: externalThreadId,
              external_message_id: externalMessageId,
              timestamp: new Date(timestamp).toISOString(),
              channel_metadata: {
                instagram_sender_id: senderId,
                instagram_recipient_id: recipientId,
              },
            });

            console.log("[instagram] Message processed:", result);

            // Fire-and-forget: compute conversation signals for the contact/lead
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
            console.error("[instagram] Failed to process message:", err);
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
