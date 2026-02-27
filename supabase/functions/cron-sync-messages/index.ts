/**
 * Cron Sync Messages - Polls GHL for new messages every minute
 * Called via pg_cron — single robust pass over all workspaces per invocation.
 * pg_cron handles the 1-minute frequency; no internal iteration loop needed.
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
    "17": "instagram", "18": "instagram",
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

// Helper: fetch with AbortController timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Helper: fetch basic contact info from GHL
interface GHLContactBasicData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  company_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  instagram_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
}

function extractSocialFromCustomFields(socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string; twitter?: string }, fields?: Array<{ id?: string; field_key?: string; key?: string; value?: string }>): { instagram_url?: string; linkedin_url?: string; facebook_url?: string } {
  const result: Record<string, string> = {};
  if (socialMedia?.linkedIn) result.linkedin_url = socialMedia.linkedIn;
  if (socialMedia?.facebook) result.facebook_url = socialMedia.facebook;
  if (socialMedia?.instagram) result.instagram_url = socialMedia.instagram;
  if (fields) {
    for (const f of fields) {
      const key = (f.field_key || f.key || f.id || "").toLowerCase();
      const val = f.value;
      if (!val) continue;
      if (!result.instagram_url && key.includes("instagram")) result.instagram_url = val.startsWith("http") ? val : `https://instagram.com/${val}`;
      if (!result.linkedin_url && key.includes("linkedin")) result.linkedin_url = val.startsWith("http") ? val : `https://linkedin.com/in/${val}`;
      if (!result.facebook_url && key.includes("facebook")) result.facebook_url = val.startsWith("http") ? val : `https://facebook.com/${val}`;
    }
  }
  return result;
}

async function fetchGHLContactBasic(apiKey: string, contactId: string): Promise<GHLContactBasicData | null> {
  try {
    const response = await fetchWithTimeout(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      },
      10000
    );
    if (!response.ok) return null;
    const data = await response.json();
    const contact = data.contact || data;

    const addressParts = [contact.address1, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
    const socialUrls = extractSocialFromCustomFields(contact.socialMedia, contact.customFields);

    return {
      id: contact.id || contactId,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name || "Contacto GHL",
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      website: contact.website || undefined,
      company_name: contact.companyName || undefined,
      address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
      city: contact.city || undefined,
      postal_code: contact.postalCode || undefined,
      instagram_url: socialUrls.instagram_url,
      linkedin_url: socialUrls.linkedin_url,
      facebook_url: socialUrls.facebook_url,
    };
  } catch (err) {
    console.error(`[Cron Sync] Error fetching GHL contact ${contactId}:`, err);
    return null;
  }
}

// Helper: create a lead from GHL contact data
async function createLeadFromGHLContact(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  contactData: GHLContactBasicData
): Promise<{ id: string } | null> {
  try {
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      name: contactData.name,
      email: contactData.email || null,
      phone: contactData.phone || null,
      ghl_contact_id: contactData.id,
      source: "ghl",
      status: "new",
    };
    if (contactData.website) insertData.website = contactData.website;
    if (contactData.company_name) insertData.company_name = contactData.company_name;
    if (contactData.address) insertData.address = contactData.address;
    if (contactData.city) insertData.city = contactData.city;
    if (contactData.postal_code) insertData.postal_code = contactData.postal_code;
    if (contactData.instagram_url) insertData.instagram_url = contactData.instagram_url;
    if (contactData.linkedin_url) insertData.linkedin_url = contactData.linkedin_url;
    if (contactData.facebook_url) insertData.facebook_url = contactData.facebook_url;

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      // Handle duplicate — contact already exists
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("ghl_contact_id", contactData.id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        return existing || null;
      }
      console.error(`[Cron Sync] Error creating lead for contact ${contactData.id}:`, error);
      return null;
    }
    console.log(`[Cron Sync] Auto-created lead ${newLead.id} for GHL contact ${contactData.id}`);
    return newLead;
  } catch (err) {
    console.error(`[Cron Sync] Error creating lead:`, err);
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

// Core sync logic — single pass over all active workspaces
async function syncAllWorkspaces(supabaseUrl: string, serviceKey: string, totalStart: number): Promise<Record<string, unknown>> {
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: ghlConfigs, error: configError } = await supabase
    .from("workspace_ghl_config")
    .select("workspace_id, ghl_api_key_encrypted, ghl_location_id")
    .eq("is_active", true);

  if (configError || !ghlConfigs?.length) {
    console.log("[Cron Sync] No active GHL configs found");
    return {};
  }

  console.log(`[Cron Sync] Processing ${ghlConfigs.length} workspace(s)`);

  const results: Record<string, unknown> = {};

  for (const config of ghlConfigs) {
    const { workspace_id, ghl_api_key_encrypted: apiKey, ghl_location_id: locationId } = config;

    if (!apiKey || !locationId) continue;

    // Safety guard: stop if approaching 55s total (edge function limit is 60s)
    if (Date.now() - totalStart > 55000) {
      console.log("[Cron Sync] Approaching 60s timeout, stopping remaining workspaces");
      break;
    }

    const wsStart = Date.now();
    console.log(`[Cron Sync] Starting workspace ${workspace_id}`);

    try {
      const queryParams = new URLSearchParams({
        locationId,
        limit: "50",
        status: "all",
      });

      const ghlUrl = `https://services.leadconnectorhq.com/conversations/search?${queryParams.toString()}`;

      console.log(`[Cron Sync] Calling GHL conversations/search for workspace ${workspace_id}`);
      const ghlResponse = await fetchWithTimeout(ghlUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-04-15",
          Accept: "application/json",
        },
      }, 15000);

      console.log(`[Cron Sync] GHL conversations/search responded ${ghlResponse.status} for workspace ${workspace_id} (${Date.now() - wsStart}ms)`);

      if (!ghlResponse.ok) {
        results[workspace_id] = { error: `GHL API ${ghlResponse.status}` };
        continue;
      }

      const ghlData = await ghlResponse.json();
      const conversations = ghlData.conversations || [];

      // Expanded window: 24 hours to catch messages missed in previous invocations
      const windowAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentConversations = conversations.filter((conv: { lastMessageDate?: string; dateUpdated?: string }) => {
        const lastDate = conv.lastMessageDate || conv.dateUpdated;
        if (!lastDate) return false;
        return new Date(lastDate) > windowAgo;
      });

      console.log(`[Cron Sync] Workspace ${workspace_id}: ${conversations.length} total, ${recentConversations.length} recent conversations`);

      if (recentConversations.length === 0) {
        results[workspace_id] = { conversations: 0, messages: 0 };

        await supabase
          .from("workspace_ghl_config")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("workspace_id", workspace_id);

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
        .select("id, external_thread_id, lead_id, channel")
        .eq("workspace_id", workspace_id)
        .not("external_thread_id", "is", null);

      const convsByThreadId = new Map<string, string>();
      const convsByLeadChannel = new Map<string, string>();
      for (const conv of existingConvs || []) {
        if (conv.external_thread_id) convsByThreadId.set(conv.external_thread_id, conv.id);
        if (conv.lead_id && conv.channel) {
          convsByLeadChannel.set(`${conv.lead_id}:${conv.channel}`, conv.id);
        }
      }

      let messagesCreated = 0;
      let conversationsCreated = 0;

      for (const ghlConv of recentConversations) {
        // Per-workspace safety: stop if we've been in this workspace too long (20s)
        if (Date.now() - wsStart > 20000) {
          console.log(`[Cron Sync] Workspace ${workspace_id} time limit (20s) reached, moving on`);
          break;
        }

        let convMessagesCreated = 0;

        const ghlConvId = ghlConv.id;
        let channel = resolveChannel(ghlConv.type);
        let leadId = leadsByGhlId.get(ghlConv.contactId);

        // Auto-create lead if not found
        if (!leadId) {
          const contactData = await fetchGHLContactBasic(apiKey, ghlConv.contactId);
          if (contactData) {
            const newLead = await createLeadFromGHLContact(supabase, workspace_id, contactData);
            if (newLead) {
              leadId = newLead.id;
              leadsByGhlId.set(ghlConv.contactId, leadId);
            }
          }
          if (!leadId) continue;
        }

        // Deduplicate: check by thread_id (with/without ghl_ prefix) then by lead+channel
        const normalizedThreadId = `ghl_${ghlConvId}`;
        let conversationId = convsByThreadId.get(normalizedThreadId)
          || convsByThreadId.get(ghlConvId)
          || convsByLeadChannel.get(`${leadId}:${channel}`);

        if (!conversationId) {
          const { data: newConv, error: convErr } = await supabase
            .from("conversations")
            .insert({
              workspace_id,
              lead_id: leadId,
              channel,
              external_thread_id: normalizedThreadId,
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
                .eq("external_thread_id", normalizedThreadId)
                .eq("workspace_id", workspace_id)
                .single();
              conversationId = existing?.id;
            } else {
              continue;
            }
          } else {
            conversationId = newConv?.id;
            conversationsCreated++;
            convsByThreadId.set(normalizedThreadId, conversationId!);
            convsByLeadChannel.set(`${leadId}:${channel}`, conversationId!);
          }
        }

        if (!conversationId) continue;

        try {
          const msgUrl = `https://services.leadconnectorhq.com/conversations/${ghlConvId}/messages`;
          console.log(`[Cron Sync] Calling GHL messages for conv ${ghlConvId}`);

          const msgResponse = await fetchWithTimeout(msgUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Version: "2021-04-15",
              Accept: "application/json",
            },
          }, 15000);

          console.log(`[Cron Sync] GHL messages responded ${msgResponse.status} for conv ${ghlConvId}`);

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
            return msgDate && msgDate > windowAgo;
          });

          console.log(`[Cron Sync] Conv ${ghlConvId}: ${messages.length} total messages, ${recentMessages.length} recent`);

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
              convMessagesCreated++;
              messagesCreated++;
            }
          }

          // After processing all messages, infer real channel from message types if current is "other" or "sms"
          if ((channel === "other" || channel === "sms") && recentMessages.length > 0) {
            const msgTypeSet = new Set<number>();
            for (const msg of recentMessages) {
              if (msg.type !== undefined) {
                const numType = typeof msg.type === "number" ? msg.type : Number(msg.type);
                if (!isNaN(numType)) msgTypeSet.add(numType);
              }
            }
            let inferredChannel: string | null = null;
            if (msgTypeSet.has(17) || msgTypeSet.has(18)) {
              inferredChannel = "instagram";
            } else if (msgTypeSet.has(15) || msgTypeSet.has(16)) {
              inferredChannel = "whatsapp";
            } else if (msgTypeSet.has(5) || msgTypeSet.has(6) || msgTypeSet.has(19)) {
              inferredChannel = "messenger";
            }
            if (inferredChannel && inferredChannel !== channel) {
              console.log(`[Cron Sync] Reclassifying conv ${ghlConvId} from "${channel}" to "${inferredChannel}" based on message types [${[...msgTypeSet].join(",")}]`);
              channel = inferredChannel;
              await supabase
                .from("conversations")
                .update({ channel: inferredChannel })
                .eq("id", conversationId);
            }
          }

          if (recentMessages.length > 0 && convMessagesCreated > 0) {
            const lastMsg = recentMessages[recentMessages.length - 1];
            const lastDirection = normalizeDirection(lastMsg?.direction);
            if (lastDirection === "inbound") {
              // SMART DEDUP: Check if there's a new inbound AFTER the last trigger
              const { data: lastTrigger } = await supabase
                .from("autopilot_events")
                .select("id, created_at")
                .eq("conversation_id", conversationId)
                .eq("event_type", "triggered")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              let shouldTrigger = true;
              if (lastTrigger) {
                const { data: newerInbound } = await supabase
                  .from("messages")
                  .select("id")
                  .eq("conversation_id", conversationId)
                  .eq("direction", "inbound")
                  .gt("sent_at", lastTrigger.created_at)
                  .limit(1)
                  .maybeSingle();

                if (!newerInbound) {
                  shouldTrigger = false;
                  console.log("[Cron Sync] Skipping autopilot — last trigger covers latest inbound", conversationId);
                }
              }

              if (shouldTrigger) {
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

      const wsDuration = Date.now() - wsStart;
      console.log(`[Cron Sync] Workspace ${workspace_id} done in ${wsDuration}ms — convs_created: ${conversationsCreated}, messages_created: ${messagesCreated}`);

      results[workspace_id] = {
        conversations: recentConversations.length,
        conversations_created: conversationsCreated,
        messages_created: messagesCreated,
        duration_ms: wsDuration,
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
  console.log(`[Cron Sync Messages] Started at ${new Date().toISOString()}`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const results = await syncAllWorkspaces(supabaseUrl, serviceKey, totalStart);

    const duration = Date.now() - totalStart;
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