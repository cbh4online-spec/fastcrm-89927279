import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GHL conversation type to channel mapping
const GHL_TYPE_CODES: Record<number, string> = {
  1: "sms", 2: "email", 3: "sms", 4: "email",
  5: "messenger", 6: "messenger", 7: "live_chat", 8: "web_widget",
  9: "whatsapp", 10: "sms", 11: "messenger", 12: "other", 13: "other",
  14: "sms", 15: "whatsapp", 16: "whatsapp", 17: "instagram",
  18: "instagram", 19: "messenger", 20: "sms",
};

const TYPE_STRING_MAP: Record<string, string> = {
  "TYPE_SMS": "sms", "TYPE_EMAIL": "email", "TYPE_WHATSAPP": "whatsapp",
  "TYPE_FB_MESSENGER": "messenger", "TYPE_INSTAGRAM": "instagram",
  "TYPE_LIVE_CHAT": "live_chat", "TYPE_PHONE": "sms", "TYPE_CALL": "sms",
  "TYPE_CUSTOM_SMS": "sms", "TYPE_CUSTOM_EMAIL": "email",
};

function resolveChannelFromType(typeCode: number | string | undefined): string | null {
  if (typeCode === undefined || typeCode === null) return null;
  const numCode = typeof typeCode === "number" ? typeCode :
    typeof typeCode === "string" && !isNaN(Number(typeCode)) ? Number(typeCode) : null;
  if (numCode !== null && GHL_TYPE_CODES[numCode]) return GHL_TYPE_CODES[numCode];
  if (typeof typeCode === "string") {
    const mapped = TYPE_STRING_MAP[typeCode.toUpperCase()];
    if (mapped) return mapped;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get GHL config
    const { data: ghlConfig } = await supabase
      .from("workspace_ghl_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!ghlConfig) {
      return new Response(JSON.stringify({ error: "GHL not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKey = ghlConfig.ghl_api_key_encrypted;
    const locationId = ghlConfig.ghl_location_id;

    if (!apiKey || !locationId) {
      return new Response(JSON.stringify({ error: "GHL credentials incomplete" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch all 'other' conversations for this workspace
    const { data: conversations, error: fetchError } = await supabase
      .from("conversations")
      .select("id, channel_metadata, external_thread_id")
      .eq("workspace_id", workspace_id)
      .eq("channel", "other");

    if (fetchError) throw fetchError;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ message: "No 'other' conversations to reclassify", reclassified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Reclassify] Found ${conversations.length} 'other' conversations to check`);

    let reclassified = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{id: string; oldChannel: string; newChannel: string}> = [];

    for (const conv of conversations) {
      try {
        // Extract GHL conversation ID
        const meta = conv.channel_metadata as Record<string, string> | null;
        const ghlConvId = meta?.ghl_conversation_id || 
          (conv.external_thread_id?.startsWith("ghl_") ? conv.external_thread_id.slice(4) : null);
        
        if (!ghlConvId) {
          console.log(`[Reclassify] No GHL conv ID for ${conv.id}, skipping`);
          skipped++;
          continue;
        }

        // Fetch conversation from GHL API
        const ghlResp = await fetch(
          `https://services.leadconnectorhq.com/conversations/${ghlConvId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Version: "2021-04-15",
              Accept: "application/json",
            },
          }
        );

        if (!ghlResp.ok) {
          console.error(`[Reclassify] GHL API error for ${ghlConvId}: ${ghlResp.status}`);
          errors++;
          continue;
        }

        const ghlData = await ghlResp.json();
        const ghlConv = ghlData.conversation || ghlData;
        const typeCode = ghlConv.type;

        const newChannel = resolveChannelFromType(typeCode);
        
        if (!newChannel || newChannel === "other") {
          // Try to infer from messages
          const msgResp = await fetch(
            `https://services.leadconnectorhq.com/conversations/${ghlConvId}/messages?limit=5`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Version: "2021-04-15",
                Accept: "application/json",
              },
            }
          );
          
          if (msgResp.ok) {
            const msgData = await msgResp.json();
            const msgs = msgData.messages?.messages || msgData.messages || [];
            for (const msg of msgs) {
              const inferredChannel = resolveChannelFromType(msg.type);
              if (inferredChannel && inferredChannel !== "other") {
                // Update conversation channel
                await supabase
                  .from("conversations")
                  .update({ 
                    channel: inferredChannel,
                    channel_metadata: { ...meta, ghl_type_code: msg.type, reclassified_at: new Date().toISOString() }
                  })
                  .eq("id", conv.id);
                
                results.push({ id: conv.id, oldChannel: "other", newChannel: inferredChannel });
                reclassified++;
                console.log(`[Reclassify] ${conv.id}: other -> ${inferredChannel} (from message type ${msg.type})`);
                break;
              }
            }
            if (!results.find(r => r.id === conv.id)) {
              skipped++;
              console.log(`[Reclassify] ${conv.id}: Could not determine channel from messages`);
            }
          } else {
            skipped++;
          }
          continue;
        }

        // Update conversation with resolved channel
        await supabase
          .from("conversations")
          .update({ 
            channel: newChannel,
            channel_metadata: { ...meta, ghl_type_code: typeCode, reclassified_at: new Date().toISOString() }
          })
          .eq("id", conv.id);

        results.push({ id: conv.id, oldChannel: "other", newChannel });
        reclassified++;
        console.log(`[Reclassify] ${conv.id}: other -> ${newChannel} (type ${typeCode})`);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[Reclassify] Error processing ${conv.id}:`, err);
        errors++;
      }
    }

    const summary = {
      total: conversations.length,
      reclassified,
      skipped,
      errors,
      results,
    };

    console.log("[Reclassify] Complete:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[Reclassify] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
