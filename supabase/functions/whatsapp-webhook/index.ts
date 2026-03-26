import { createClient } from "@supabase/supabase-js";
import { normalizeIncomingMessage } from "../_shared/normalize-message.ts";
import { triggerWhatsAppAutopilot } from "../_shared/whatsapp-autopilot.ts";

Deno.serve(async (req) => {
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
            .select("workspace_id, auto_create_leads")
            .eq("phone_number_id", phoneNumberId)
            .eq("is_active", true)
            .single();

          if (connError || !connection) {
            console.log("No active connection for phone_number_id:", phoneNumberId);
            continue;
          }

          const workspaceId = connection.workspace_id;
          const autoCreateLeads = connection.auto_create_leads !== false; // default true

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

            // --- Auto-create lead if enabled ---
            let leadId: string | null = null;
            if (autoCreateLeads) {
              try {
                // Search by phone (external_whatsapp_id or phone)
                const { data: existingLead } = await supabase
                  .from("leads")
                  .select("id")
                  .eq("workspace_id", workspaceId)
                  .or(`phone.eq.${senderId},external_whatsapp_id.eq.${senderId},phone.eq.+${senderId}`)
                  .limit(1)
                  .maybeSingle();

                if (existingLead) {
                  leadId = existingLead.id;
                  console.log("[whatsapp] Existing lead found:", leadId);
                } else {
                  // Create new lead
                  const senderName = value.contacts?.find((c: any) => c.wa_id === senderId)?.profile?.name;
                  const { data: newLead, error: leadError } = await supabase
                    .from("leads")
                    .insert({
                      workspace_id: workspaceId,
                      name: senderName || `WhatsApp +${senderId}`,
                      phone: senderId,
                      external_whatsapp_id: senderId,
                      source: "whatsapp",
                      status: "new",
                      tags: ["whatsapp"],
                    })
                    .select("id")
                    .single();

                  if (leadError) {
                    console.error("[whatsapp] Failed to create lead:", leadError);
                  } else {
                    leadId = newLead.id;
                    console.log("[whatsapp] New lead created:", leadId);
                  }
                }
              } catch (leadErr) {
                console.error("[whatsapp] Lead creation error:", leadErr);
              }
            }

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
                lead_id: leadId || undefined,
                channel_metadata: {
                  whatsapp_sender: senderId,
                  whatsapp_phone_number_id: phoneNumberId,
                },
              });

              console.log("[whatsapp] Message processed:", result);

              // Update conversation with lead_id if we have one and it's a new conversation
              if (leadId && result.is_new_conversation) {
                await supabase
                  .from("conversations")
                  .update({ lead_id: leadId })
                  .eq("id", result.conversation_id)
                  .is("lead_id", null);
              }

              // Update lead last_contact_at
              if (leadId) {
                await supabase
                  .from("leads")
                  .update({ last_contact_at: timestamp })
                  .eq("id", leadId);
              }

              // Fire-and-forget: compute conversation signals
              if (result?.contact_id || leadId) {
                (async () => {
                  try {
                    await fetch(`${SUPABASE_URL}/functions/v1/compute-conversation-signals`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                      },
                      body: JSON.stringify({
                        workspace_id: workspaceId,
                        contact_id: result.contact_id || null,
                        lead_id: leadId || null,
                      }),
                    });
                  } catch { /* silent */ }
                })();
              }

              // Fire-and-forget: trigger autopilot AI response
              if (!result.is_duplicate) {
                (async () => {
                  try {
                    await triggerWhatsAppAutopilot(supabase, {
                      workspaceId,
                      conversationId: result.conversation_id,
                      messageId: result.message_id,
                      channel: "whatsapp",
                      leadId,
                      contactId: result.contact_id || null,
                      senderId,
                      phoneNumberId,
                    });
                  } catch (autopilotErr) {
                    console.error("[whatsapp] Autopilot error:", autopilotErr);
                  }
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
