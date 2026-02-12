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

// Core sync logic extracted into a function
async function syncAllWorkspaces(supabaseUrl: string, serviceKey: string, iterationStart: number): Promise<Record<string, unknown>> {
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: ghlConfigs, error: configError } = await supabase
    .from("workspace_ghl_config")
    .select("workspace_id, ghl_api_key_encrypted, ghl_location_id")
    .eq("is_active", true);

  if (configError || !ghlConfigs?.length) {
    console.log("[Cron Sync] No active GHL configs found");
    return {};
  }

  const results: Record<string, unknown> = {};

  for (const config of ghlConfigs) {
    const { workspace_id, ghl_api_key_encrypted: apiKey, ghl_location_id: locationId } = config;

    if (!apiKey || !locationId) continue;

    // Guard per-iteration time (max 4s per workspace per iteration)
    if (Date.now() - iterationStart > 4000) {
      console.log("[Cron Sync] Iteration time limit reached, stopping workspaces");
      break;
    }

    try {
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
        results[workspace_id] = { error: `GHL API ${ghlResponse.status}` };
        continue;
      }

      const ghlData = await ghlResponse.json();
      const conversations = ghlData.conversations || [];

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
        if (Date.now() - iterationStart > 4500) break;

        const ghlConvId = ghlConv.id;
        let conversationId = convsByThreadId.get(ghlConvId);
        let channel = resolveChannel(ghlConv.type);
        const leadId = leadsByGhlId.get(ghlConv.contactId);

        if (!leadId) continue;

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
              const { data: existing } = await supabase
                .from("conversations")
                .select("id")
                .eq("external_thread_id", ghlConvId)
                .eq("workspace_id", workspace_id)
                .single();
              conversationId = existing?.id;
            } else {
              continue;
            }
          } else {
            conversationId = newConv?.id;
            conversationsCreated++;
            convsByThreadId.set(ghlConvId, conversationId!);
          }
        }

        if (!conversationId) continue;

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
          }

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

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const totalStart = Date.now();
  const ITERATIONS = 12;
  const INTERVAL_MS = 5000;
  console.log(`[Cron Sync Messages] Started at ${new Date().toISOString()} — will run ${ITERATIONS} iterations (every ${INTERVAL_MS / 1000}s)`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const allResults: Array<{ iteration: number; results: Record<string, unknown> }> = [];

  try {
    for (let i = 0; i < ITERATIONS; i++) {
      const iterationStart = Date.now();
      console.log(`[Cron Sync] Iteration ${i + 1}/${ITERATIONS} at ${new Date().toISOString()}`);

      // Safety: stop if we're approaching the 60s edge function timeout
      if (Date.now() - totalStart > 55000) {
        console.log("[Cron Sync] Approaching 60s timeout, stopping iterations");
        break;
      }

      const results = await syncAllWorkspaces(supabaseUrl, serviceKey, iterationStart);
      allResults.push({ iteration: i + 1, results });

      // Wait 5s before next iteration (skip wait on last iteration)
      if (i < ITERATIONS - 1) {
        const elapsed = Date.now() - iterationStart;
        const waitTime = Math.max(0, INTERVAL_MS - elapsed);
        if (waitTime > 0) {
          await new Promise((r) => setTimeout(r, waitTime));
        }
      }
    }

    const duration = Date.now() - totalStart;
    console.log(`[Cron Sync] All iterations completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, duration_ms: duration, iterations: allResults.length, results: allResults }),
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
