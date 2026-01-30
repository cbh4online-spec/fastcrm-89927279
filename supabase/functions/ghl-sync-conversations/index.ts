// Version 1.0 - GHL Conversation Sync
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
              
              // Use GET /conversations/ with query params (correct GHL API endpoint)
              const queryParams = new URLSearchParams({
                locationId,
                limit: "50",
              });
              if (lastId) {
                queryParams.set("startAfterId", lastId);
              }
              
              const ghlUrl = `https://services.leadconnectorhq.com/conversations/?${queryParams.toString()}`;
              
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

                // Find the lead for this conversation
                const leadId = leadsByGhlId.get(ghlConv.contactId);
                if (!leadId) {
                  console.log(`[GHL Sync Conversations] No lead found for contact ${ghlConv.contactId}`);
                  continue;
                }

                const channel = resolveChannel(ghlConv.type, ghlConv.lastMessageType);
                const externalThreadId = `ghl_${ghlConv.id}`;

                // Check if conversation exists
                let conversationId = conversationsByThreadId.get(externalThreadId);

                if (!conversationId) {
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
                      last_message_at: ghlConv.lastMessageDate || ghlConv.dateUpdated,
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
                  await supabase
                    .from("conversations")
                    .update({
                      last_message_at: ghlConv.lastMessageDate || ghlConv.dateUpdated,
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
                      const messages: GHLMessage[] = msgData.messages || [];

                      for (const msg of messages) {
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

                        const { error: msgError } = await supabase
                          .from("messages")
                          .insert({
                            conversation_id: conversationId,
                            workspace_id,
                            content: msg.body || "",
                            direction,
                            sent_at: msg.dateAdded || new Date().toISOString(),
                            ghl_message_id: msg.id,
                            external_message_id: msg.id,
                            attachments: attachments.length > 0 ? attachments : null,
                          });

                        if (msgError) {
                          if (msgError.code === "23505") {
                            result.messages_skipped++;
                          } else {
                            console.error(`[GHL Sync Conversations] Message error`, msgError);
                          }
                        } else {
                          result.messages_created++;
                          existingMessageIds.add(msg.id);
                        }
                      }
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
