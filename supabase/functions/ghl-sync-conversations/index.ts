// Version 1.1 - GHL Conversation Sync (fixed message parsing + auto-lead creation)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: Fetch contact details from GHL API
async function fetchGHLContact(apiKey: string, contactId: string): Promise<{name: string; email: string | null; phone: string | null; ghl_contact_id: string} | null> {
  try {
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-04-15",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[GHL Sync] Failed to fetch contact ${contactId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const contact = data.contact || data;

    const firstName = contact.firstName || contact.first_name || "";
    const lastName = contact.lastName || contact.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || contact.name || `GHL Contact ${contactId.substring(0, 8)}`;

    return {
      name,
      email: contact.email || null,
      phone: contact.phone || null,
      ghl_contact_id: contactId,
    };
  } catch (err) {
    console.error(`[GHL Sync] Error fetching contact ${contactId}:`, err);
    return null;
  }
}

// Helper: Create a lead from GHL contact data
async function createLeadFromGHLContact(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string,
  contactData: {name: string; email: string | null; phone: string | null; ghl_contact_id: string}
): Promise<{id: string} | null> {
  try {
    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        workspace_id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        ghl_contact_id: contactData.ghl_contact_id,
        source: "ghl_auto_sync",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[GHL Sync] Error creating lead for contact ${contactData.ghl_contact_id}:`, error);
      return null;
    }

    console.log(`[GHL Sync] Auto-created lead ${newLead.id} for GHL contact ${contactData.ghl_contact_id} (${contactData.name})`);
    return newLead;
  } catch (err) {
    console.error(`[GHL Sync] Exception creating lead:`, err);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  type?: number;
  unreadCount?: number;
  dateAdded?: string;
  dateUpdated?: string;
  lastMessageType?: string;
  lastMessageBody?: string;
  lastMessageDirection?: string;
  lastMessageDate?: string;
}

interface GHLMessage {
  id: string;
  conversationId: string;
  contactId: string;
  body: string;
  type?: number;
  direction?: string;
  status?: string;
  dateAdded?: string;
  attachments?: Array<{
    url?: string;
    type?: string;
    name?: string;
  }>;
}

interface SyncResult {
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_skipped: number;
  errors: string[];
  total_processed: number;
}

// GHL message type numeric codes
const GHL_TYPE_CODES: Record<number, string> = {
  1: "sms",
  2: "email",
  3: "sms",
  4: "email",
  5: "messenger",
  6: "messenger",
  7: "live_chat",
  8: "web_widget",
  9: "whatsapp",
  10: "phone",
  11: "messenger",
  12: "other",
  13: "other",
  14: "sms",
  15: "whatsapp",
  16: "whatsapp",
  17: "instagram",
  18: "instagram",
  19: "messenger",
  20: "phone",
};

function resolveChannel(typeCode?: number, fallback?: string): string {
  if (typeof typeCode === "number" && GHL_TYPE_CODES[typeCode]) {
    return GHL_TYPE_CODES[typeCode];
  }
  
  if (fallback) {
    const channelMap: Record<string, string> = {
      "sms": "sms",
      "email": "email",
      "whatsapp": "whatsapp",
      "facebook": "messenger",
      "fb": "messenger",
      "messenger": "messenger",
      "instagram": "instagram",
      "ig": "instagram",
      "live_chat": "live_chat",
      "webchat": "web_widget",
    };
    return channelMap[fallback.toLowerCase()] || "other";
  }
  
  return "other";
}

/**
 * Convert GHL timestamp (can be Unix ms, Unix s, or ISO string) to ISO string
 */
function normalizeTimestamp(value?: string | number): string | null {
  if (!value) return null;
  
  // If it's already a string that looks like ISO, return it
  if (typeof value === "string") {
    // Check if it's a valid ISO date
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
    // Try to parse as number string
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      value = numValue;
    } else {
      return null;
    }
  }
  
  // Handle numeric timestamps
  if (typeof value === "number") {
    // If value is > 1e12, it's in milliseconds, otherwise seconds
    if (value > 1e12) {
      return new Date(value).toISOString();
    } else if (value > 1e9) {
      return new Date(value * 1000).toISOString();
    }
  }
  
  return null;
}

function normalizeDirection(direction?: string): "inbound" | "outbound" {
  if (!direction) return "inbound";
  const lower = direction.toLowerCase();
  if (["outbound", "outgoing", "sent", "out"].includes(lower)) {
    return "outbound";
  }
  return "inbound";
}

Deno.serve(async (req) => {
  console.log(`[GHL Sync Conversations v1.0] Function started at ${new Date().toISOString()}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { workspace_id, stream, include_messages = true, days_back = 30 } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get GHL config
    const { data: ghlConfig, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError || !ghlConfig) {
      return new Response(
        JSON.stringify({ error: "GHL configuration not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = ghlConfig.ghl_api_key_encrypted;
    const locationId = ghlConfig.ghl_location_id;

    if (!apiKey || !locationId) {
      return new Response(
        JSON.stringify({ error: "GHL API Key or Location ID not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GHL Sync Conversations] Starting sync for workspace ${workspace_id}`);

    // Load existing leads mapped by GHL contact ID
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, ghl_contact_id")
      .eq("workspace_id", workspace_id)
      .not("ghl_contact_id", "is", null);

    const leadsByGhlId = new Map<string, string>();
    for (const lead of existingLeads || []) {
      if (lead.ghl_contact_id) {
        leadsByGhlId.set(lead.ghl_contact_id, lead.id);
      }
    }

    // Load existing conversations
    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("id, external_thread_id")
      .eq("workspace_id", workspace_id)
      .not("external_thread_id", "is", null);

    const conversationsByThreadId = new Map<string, string>();
    for (const conv of existingConversations || []) {
      if (conv.external_thread_id) {
        conversationsByThreadId.set(conv.external_thread_id, conv.id);
      }
    }

    // Load existing message GHL IDs
    const { data: existingMessages } = await supabase
      .from("messages")
      .select("ghl_message_id")
      .eq("workspace_id", workspace_id)
      .not("ghl_message_id", "is", null);

    const existingMessageIds = new Set<string>(
      (existingMessages || []).map(m => m.ghl_message_id).filter(Boolean)
    );

    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          const result: SyncResult = {
            conversations_created: 0,
            conversations_updated: 0,
            messages_created: 0,
            messages_skipped: 0,
            errors: [],
            total_processed: 0,
          };

          const startTime = Date.now();
          const maxExecutionTime = 50000;

          try {
            // Fetch conversations from GHL
            let hasMore = true;
            let pageCount = 0;
            const maxPages = 50;

            // Calculate date filter
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days_back);

            let lastId: string | undefined;

            while (hasMore && pageCount < maxPages) {
              if (Date.now() - startTime > maxExecutionTime) {
                result.errors.push(`Sincronização parcial: timeout após ${pageCount} páginas.`);
                break;
              }

              pageCount++;
              
              // Use GET /conversations/search with query params (correct GHL API endpoint)
              const queryParams = new URLSearchParams({
                locationId,
                limit: "50",
              });
              if (lastId) {
                queryParams.set("startAfterId", lastId);
              }
              
              const ghlUrl = `https://services.leadconnectorhq.com/conversations/search?${queryParams.toString()}`;
              
              console.log(`[GHL Sync Conversations] Fetching page ${pageCount}: ${ghlUrl}`);

              const ghlResponse = await fetch(ghlUrl, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Version: "2021-04-15",
                  Accept: "application/json",
                },
              });

              if (!ghlResponse.ok) {
                const errorText = await ghlResponse.text();
                console.error(`[GHL Sync Conversations] API Error: ${ghlResponse.status} - ${errorText}`);
                
                if (ghlResponse.status === 401) {
                  result.errors.push("API Key inválida ou expirada.");
                } else if (ghlResponse.status === 403) {
                  result.errors.push("Acesso negado. Verifique permissões da API.");
                } else {
                  result.errors.push(`Erro GHL: ${ghlResponse.status}`);
                }
                break;
              }

              const data = await ghlResponse.json();
              const conversations: GHLConversation[] = data.conversations || [];

              if (conversations.length === 0) {
                hasMore = false;
                break;
              }

              for (const ghlConv of conversations) {
                result.total_processed++;

                // Find or auto-create lead for this conversation
                let leadId = leadsByGhlId.get(ghlConv.contactId);
                if (!leadId) {
                  console.log(`[GHL Sync] No lead found for contact ${ghlConv.contactId}, auto-creating...`);
                  const contactData = await fetchGHLContact(apiKey, ghlConv.contactId);
                  if (contactData) {
                    const newLead = await createLeadFromGHLContact(supabase, workspace_id, contactData);
                    if (newLead) {
                      leadId = newLead.id;
                      leadsByGhlId.set(ghlConv.contactId, leadId);
                    }
                  }
                  if (!leadId) {
                    console.log(`[GHL Sync] Could not create lead for contact ${ghlConv.contactId}, skipping conversation`);
                    result.errors.push(`Failed to create lead for contact ${ghlConv.contactId}`);
                    continue;
                  }
                }

                console.log(`[GHL Sync] Conv ${ghlConv.id} type=${ghlConv.type}, lastMessageType=${ghlConv.lastMessageType}`);
                let channel = resolveChannel(ghlConv.type, ghlConv.lastMessageType);
                const externalThreadId = `ghl_${ghlConv.id}`;

                // Check if conversation exists
                let conversationId = conversationsByThreadId.get(externalThreadId);

                if (!conversationId) {
                  // Normalize the timestamp from GHL
                  const lastMessageAt = normalizeTimestamp(ghlConv.lastMessageDate) || 
                                        normalizeTimestamp(ghlConv.dateUpdated) || 
                                        new Date().toISOString();
                  
                  // Create new conversation
                  const { data: newConv, error: convError } = await supabase
                    .from("conversations")
                    .insert({
                      workspace_id,
                      lead_id: leadId,
                      channel,
                      status: "open",
                      unread_count: ghlConv.unreadCount || 0,
                      external_thread_id: externalThreadId,
                      last_message_at: lastMessageAt,
                      last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
                      channel_metadata: {
                        ghl_conversation_id: ghlConv.id,
                        ghl_contact_id: ghlConv.contactId,
                        source: "ghl_sync",
                      },
                    })
                    .select("id")
                    .single();

                  if (convError || !newConv) {
                    console.error(`[GHL Sync Conversations] Error creating conversation`, convError);
                    continue;
                  }

                  conversationId = newConv.id;
                  conversationsByThreadId.set(externalThreadId, conversationId);
                  result.conversations_created++;
                  console.log(`[GHL Sync Conversations] Created conversation ${conversationId}`);
                } else {
                  // Update existing conversation
                  const lastMessageAt = normalizeTimestamp(ghlConv.lastMessageDate) || 
                                        normalizeTimestamp(ghlConv.dateUpdated);
                  
                  await supabase
                    .from("conversations")
                    .update({
                      last_message_at: lastMessageAt,
                      last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
                      unread_count: ghlConv.unreadCount || 0,
                    })
                    .eq("id", conversationId);
                  
                  result.conversations_updated++;
                }

                // Fetch messages for this conversation if enabled
                if (include_messages && conversationId) {
                  try {
                    const messagesUrl = `https://services.leadconnectorhq.com/conversations/${ghlConv.id}/messages`;
                    
                    const msgResponse = await fetch(messagesUrl, {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${apiKey}`,
                        Version: "2021-04-15",
                        Accept: "application/json",
                      },
                    });

                    if (msgResponse.ok) {
                      const msgData = await msgResponse.json();
                      
                      // Robust parsing: handle multiple response formats from GHL API
                      let rawMessages = msgData.messages;
                      if (rawMessages && !Array.isArray(rawMessages) && typeof rawMessages === "object") {
                        // Nested format: { messages: { messages: [...] } }
                        rawMessages = rawMessages.messages || Object.values(rawMessages);
                      }
                      if (!rawMessages) {
                        rawMessages = msgData.data || [];
                      }
                      const messages: GHLMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
                      
                      console.log(`[GHL Sync] Conv ${ghlConv.id} messages response keys: ${Object.keys(msgData).join(",")}, parsed count: ${messages.length}`);

                      for (const msg of messages) {
                        if (!msg || !msg.id) continue;
                        
                        // Skip if already synced
                        if (existingMessageIds.has(msg.id)) {
                          result.messages_skipped++;
                          continue;
                        }

                        const direction = normalizeDirection(msg.direction);
                        const attachments = (msg.attachments || []).map(att => ({
                          url: att.url,
                          type: att.type || "file",
                          name: att.name || "attachment",
                        }));

                        const sentAt = normalizeTimestamp(msg.dateAdded) || new Date().toISOString();
                        
                        const { error: msgError } = await supabase
                          .from("messages")
                          .insert({
                            conversation_id: conversationId,
                            workspace_id,
                            content: msg.body || "",
                            direction,
                            sent_at: sentAt,
                            ghl_message_id: msg.id,
                            external_message_id: msg.id,
                            attachments: attachments.length > 0 ? attachments : null,
                          });

                        if (msgError) {
                          if (msgError.code === "23505") {
                            result.messages_skipped++;
                          } else {
                            console.error(`[GHL Sync] Message insert error for ${msg.id}:`, msgError);
                          }
                        } else {
                          result.messages_created++;
                          existingMessageIds.add(msg.id);
                        }
                      }
                      // After processing messages, infer channel from message types if still "other"
                      if (channel === "other" && messages.length > 0) {
                        for (const msg of messages) {
                          if (msg.type !== undefined) {
                            const inferredChannel = resolveChannel(msg.type);
                            if (inferredChannel !== "other") {
                              console.log(`[GHL Sync] Inferred channel "${inferredChannel}" from message type ${msg.type} for conv ${ghlConv.id}`);
                              channel = inferredChannel;
                              // Update the conversation channel in the database
                              await supabase
                                .from("conversations")
                                .update({ channel: inferredChannel })
                                .eq("id", conversationId);
                              break;
                            }
                          }
                        }
                      }
                    } else {
                      console.error(`[GHL Sync] Messages API error for conv ${ghlConv.id}: ${msgResponse.status}`);
                    }
                  } catch (msgErr) {
                    console.error(`[GHL Sync Conversations] Error fetching messages`, msgErr);
                  }
                }

                // Send progress
                send("progress", {
                  page: pageCount,
                  processed: result.total_processed,
                  conversations_created: result.conversations_created,
                  messages_created: result.messages_created,
                });
              }

              // Update lastId for pagination
              if (conversations.length > 0) {
                lastId = conversations[conversations.length - 1].id;
              }
              
              // Continue if we got a full page
              hasMore = conversations.length >= 50;
            }

            // Update last_sync_at
            await supabase
              .from("workspace_ghl_config")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("workspace_id", workspace_id);

            // Log sync
            await supabase.from("ghl_sync_log").insert({
              workspace_id,
              ghl_entity_type: "conversation_batch",
              ghl_entity_id: crypto.randomUUID(),
              fastcrm_entity_type: "conversations",
              fastcrm_entity_id: crypto.randomUUID(),
              event_type: result.errors.length > 0 ? "sync_with_errors" : "full_sync",
              payload: result,
            });

            send("complete", result);
            
          } catch (err) {
            console.error("[GHL Sync Conversations] Stream error:", err);
            send("error", { error: err instanceof Error ? err.message : "Unknown error" });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming mode - simplified
    return new Response(
      JSON.stringify({ 
        message: "Use stream=true for conversation sync",
        hint: "POST with { workspace_id, stream: true }" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[GHL Sync Conversations] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
