/**
 * Cron Sync Messages - Polls GHL for new messages every minute
 * Called via pg_cron, iterates all active workspaces with GHL config
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: normalize direction
function normalizeDirection(dir: string | undefined): "inbound" | "outbound" {
  if (!dir) return "inbound";
  const lower = dir.toLowerCase();
  if (["outbound", "outgoing", "sent", "out"].includes(lower)) return "outbound";
  return "inbound";
}

// Helper: resolve channel from GHL message type
function resolveChannel(type: number | string | undefined): string {
  const typeMap: Record<string, string> = {
    "1": "sms", "2": "email", "3": "sms", "4": "sms",
    "5": "voicemail", "6": "facebook", "7": "facebook",
    "8": "email", "15": "whatsapp", "16": "whatsapp",
    "17": "whatsapp", "18": "instagram",
  };
  return typeMap[String(type)] || "other";
}

// Helper: normalize timestamp
function normalizeTimestamp(ts: string | undefined | null): string | null {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// Helper: trigger autopilot for new inbound messages
async function triggerAutopilot(
  supabaseUrl: string,
  serviceKey: string,
  params: { workspaceId: string; conversationId: string; channel: string; leadId: string; ghlContactId: string; locationId: string }
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/ghl-webhook-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "autopilot_trigger",
        workspace_id: params.workspaceId,
        conversation_id: params.conversationId,
        channel: params.channel,
        lead_id: params.leadId,
        ghl_contact_id: params.ghlContactId,
        location_id: params.locationId,
      }),
    });
  } catch (err) {
    console.error("[Cron Sync] Autopilot trigger error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[Cron Sync Messages] Started at ${new Date().toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active GHL configs
    const { data: ghlConfigs, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id, ghl_api_key_encrypted, ghl_location_id")
      .eq("is_active", true);

    if (configError || !ghlConfigs?.length) {
      console.log("[Cron Sync] No active GHL configs found");
      return new Response(JSON.stringify({ message: "No active configs", workspaces: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown> = {};

    for (const config of ghlConfigs) {
      const { workspace_id, ghl_api_key_encrypted: apiKey, ghl_location_id: locationId } = config;

      if (!apiKey || !locationId) {
        console.log(`[Cron Sync] Skipping workspace ${workspace_id}: missing API key or location ID`);
        continue;
      }

      // Enforce max execution time per workspace (15s) to not hit edge function limits
      if (Date.now() - startTime > 45000) {
        console.log("[Cron Sync] Approaching timeout, stopping");
        break;
      }

      try {
        console.log(`[Cron Sync] Processing workspace ${workspace_id}`);

        // Fetch recent conversations from GHL (last 30 min only)
        const queryParams = new URLSearchParams({
          locationId,
          limit: "50",
          status: "all",
        });

        const ghlUrl = `https://services.leadconnectorhq.com/conversations/search?${queryParams.toString()}`;
        const ghlResponse = await fetch(ghlUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Version: "2021-04-15",
            Accept: "application/json",
          },
        });

        if (!ghlResponse.ok) {
          console.error(`[Cron Sync] GHL API error for workspace ${workspace_id}: ${ghlResponse.status}`);
          results[workspace_id] = { error: `GHL API ${ghlResponse.status}` };
          continue;
        }

        const ghlData = await ghlResponse.json();
        const conversations = ghlData.conversations || [];

        // Filter to only conversations updated in last 30 minutes
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
        const recentConversations = conversations.filter((conv: { lastMessageDate?: string; dateUpdated?: string }) => {
          const lastDate = conv.lastMessageDate || conv.dateUpdated;
          if (!lastDate) return false;
          return new Date(lastDate) > thirtyMinAgo;
        });

        if (recentConversations.length === 0) {
          results[workspace_id] = { conversations: 0, messages: 0 };
          continue;
        }

        console.log(`[Cron Sync] Found ${recentConversations.length} recent conversations for workspace ${workspace_id}`);

        // Load existing leads and conversations for this workspace
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("id, ghl_contact_id")
          .eq("workspace_id", workspace_id)
          .not("ghl_contact_id", "is", null);

        const leadsByGhlId = new Map<string, string>();
        for (const lead of existingLeads || []) {
          if (lead.ghl_contact_id) leadsByGhlId.set(lead.ghl_contact_id, lead.id);
        }

        const { data: existingConvs } = await supabase
          .from("conversations")
          .select("id, external_thread_id")
          .eq("workspace_id", workspace_id)
          .not("external_thread_id", "is", null);

        const convsByThreadId = new Map<string, string>();
        for (const conv of existingConvs || []) {
          if (conv.external_thread_id) convsByThreadId.set(conv.external_thread_id, conv.id);
        }

        let messagesCreated = 0;
        let conversationsCreated = 0;

        for (const ghlConv of recentConversations) {
          if (Date.now() - startTime > 50000) break;

          const ghlConvId = ghlConv.id;
          let conversationId = convsByThreadId.get(ghlConvId);
          let channel = resolveChannel(ghlConv.type);
          const leadId = leadsByGhlId.get(ghlConv.contactId);

          // Skip if no lead mapping (we don't auto-create leads in cron to keep it fast)
          if (!leadId) continue;

          // Create conversation if it doesn't exist
          if (!conversationId) {
            const { data: newConv, error: convErr } = await supabase
              .from("conversations")
              .insert({
                workspace_id,
                lead_id: leadId,
                channel,
                external_thread_id: ghlConvId,
                last_message_at: normalizeTimestamp(ghlConv.lastMessageDate) || new Date().toISOString(),
                last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
                status: "open",
              })
              .select("id")
              .single();

            if (convErr) {
              if (convErr.code === "23505") {
                // Already exists, fetch it
                const { data: existing } = await supabase
                  .from("conversations")
                  .select("id")
                  .eq("external_thread_id", ghlConvId)
                  .eq("workspace_id", workspace_id)
                  .single();
                conversationId = existing?.id;
              } else {
                console.error(`[Cron Sync] Conv insert error:`, convErr);
                continue;
              }
            } else {
              conversationId = newConv?.id;
              conversationsCreated++;
              convsByThreadId.set(ghlConvId, conversationId!);
            }
          }

          if (!conversationId) continue;

          // Fetch messages for this conversation
          try {
            const msgResponse = await fetch(
              `https://services.leadconnectorhq.com/conversations/${ghlConvId}/messages`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Version: "2021-04-15",
                  Accept: "application/json",
                },
              }
            );

            if (!msgResponse.ok) continue;

            const msgData = await msgResponse.json();
            let rawMessages = msgData.messages;
            if (rawMessages && !Array.isArray(rawMessages) && typeof rawMessages === "object") {
              rawMessages = rawMessages.messages || Object.values(rawMessages);
            }
            if (!rawMessages) rawMessages = msgData.data || [];
            const messages: Array<{
              id: string;
              body?: string;
              direction?: string;
              dateAdded?: string;
              type?: number;
              attachments?: Array<{ url: string; type?: string; name?: string }>;
            }> = Array.isArray(rawMessages) ? rawMessages : [];

            // Only process messages from last 30 minutes
            const recentMessages = messages.filter((msg) => {
              const msgDate = msg.dateAdded ? new Date(msg.dateAdded) : null;
              return msgDate && msgDate > thirtyMinAgo;
            });

            for (const msg of recentMessages) {
              if (!msg?.id) continue;

              const direction = normalizeDirection(msg.direction);
              const sentAt = normalizeTimestamp(msg.dateAdded) || new Date().toISOString();
              const attachments = (msg.attachments || []).map((att) => ({
                url: att.url,
                type: att.type || "file",
                name: att.name || "attachment",
              }));

              const { error: msgError } = await supabase.from("messages").insert({
                conversation_id: conversationId,
                workspace_id,
                content: msg.body || "",
                direction,
                sent_at: sentAt,
                ghl_message_id: msg.id,
                external_message_id: msg.id,
                attachments: attachments.length > 0 ? attachments : null,
              });

              if (!msgError) {
                messagesCreated++;

                // Infer channel from message type
                if (channel === "other" && msg.type !== undefined) {
                  const inferredChannel = resolveChannel(msg.type);
                  if (inferredChannel !== "other") {
                    channel = inferredChannel;
                    await supabase
                      .from("conversations")
                      .update({ channel: inferredChannel })
                      .eq("id", conversationId);
                  }
                }
              }
              // Skip duplicates silently (23505)
            }

            // Trigger autopilot for the last inbound message if recent
            if (recentMessages.length > 0 && messagesCreated > 0) {
              const lastMsg = recentMessages[recentMessages.length - 1];
              const lastDirection = normalizeDirection(lastMsg?.direction);
              if (lastDirection === "inbound") {
                triggerAutopilot(supabaseUrl, serviceKey, {
                  workspaceId: workspace_id,
                  conversationId: conversationId!,
                  channel,
                  leadId,
                  ghlContactId: ghlConv.contactId,
                  locationId,
                });
              }
            }

            // Update conversation metadata
            await supabase
              .from("conversations")
              .update({
                last_message_at: normalizeTimestamp(ghlConv.lastMessageDate) || new Date().toISOString(),
                last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
              })
              .eq("id", conversationId);
          } catch (msgErr) {
            console.error(`[Cron Sync] Error fetching messages for conv ${ghlConvId}:`, msgErr);
          }
        }

        // Update last_sync_at
        await supabase
          .from("workspace_ghl_config")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("workspace_id", workspace_id);

        results[workspace_id] = {
          conversations: recentConversations.length,
          conversations_created: conversationsCreated,
          messages_created: messagesCreated,
        };
      } catch (wsErr) {
        console.error(`[Cron Sync] Error processing workspace ${workspace_id}:`, wsErr);
        results[workspace_id] = { error: wsErr instanceof Error ? wsErr.message : "Unknown error" };
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron Sync] Completed in ${duration}ms`, results);

    return new Response(
      JSON.stringify({ success: true, duration_ms: duration, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Cron Sync] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
