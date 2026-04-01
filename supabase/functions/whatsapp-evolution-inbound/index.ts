import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Normalize phone number: strip non-digits, remove leading "55" country code duplicate if needed.
 */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Extract message content from Evolution API payload.
 * Supports: text, image, audio, video, document, sticker.
 */
function extractMessageContent(data: Record<string, unknown>): {
  content: string;
  messageType: string;
  mediaUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
} {
  const msg = (data.message || data) as Record<string, unknown>;

  // Text message
  if (msg.conversation || msg.extendedTextMessage) {
    const text = (msg.conversation as string) ||
      ((msg.extendedTextMessage as Record<string, unknown>)?.text as string) || "";
    return { content: text, messageType: "text", mediaUrl: null, mimeType: null, fileName: null };
  }

  // Image
  if (msg.imageMessage) {
    const im = msg.imageMessage as Record<string, unknown>;
    return {
      content: (im.caption as string) || "[Imagem]",
      messageType: "image",
      mediaUrl: (im.url as string) || null,
      mimeType: (im.mimetype as string) || "image/jpeg",
      fileName: null,
    };
  }

  // Audio
  if (msg.audioMessage) {
    const am = msg.audioMessage as Record<string, unknown>;
    return {
      content: "[Áudio]",
      messageType: "audio",
      mediaUrl: (am.url as string) || null,
      mimeType: (am.mimetype as string) || "audio/ogg",
      fileName: null,
    };
  }

  // Video
  if (msg.videoMessage) {
    const vm = msg.videoMessage as Record<string, unknown>;
    return {
      content: (vm.caption as string) || "[Vídeo]",
      messageType: "video",
      mediaUrl: (vm.url as string) || null,
      mimeType: (vm.mimetype as string) || "video/mp4",
      fileName: null,
    };
  }

  // Document
  if (msg.documentMessage) {
    const dm = msg.documentMessage as Record<string, unknown>;
    return {
      content: (dm.fileName as string) || "[Documento]",
      messageType: "document",
      mediaUrl: (dm.url as string) || null,
      mimeType: (dm.mimetype as string) || "application/octet-stream",
      fileName: (dm.fileName as string) || null,
    };
  }

  // Sticker
  if (msg.stickerMessage) {
    return { content: "[Sticker]", messageType: "sticker", mediaUrl: null, mimeType: null, fileName: null };
  }

  // Fallback
  return { content: "[Mensagem não suportada]", messageType: "unknown", mediaUrl: null, mimeType: null, fileName: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const event = body?.event;

    console.log(`[WA_INBOUND] event=${event} instance=${body?.instance}`);

    // We only process messages.upsert for inbound messages
    if (event !== "messages.upsert") {
      return jsonRes({ received: true, ignored: true });
    }

    // Validate webhook secret if configured
    const WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get("x-webhook-secret") || body?.apikey;
      if (incomingSecret !== WEBHOOK_SECRET) {
        console.warn("[WA_INBOUND] INVALID_SECRET");
        return jsonRes({ error: "Unauthorized" }, 401);
      }
    }

    const instanceName = body?.instance as string | undefined;
    const msgData = body?.data as Record<string, unknown> | undefined;

    if (!instanceName || !msgData) {
      console.warn("[WA_INBOUND] Missing instance or data");
      return jsonRes({ error: "Missing instance or data" }, 400);
    }

    // Determine if inbound (fromMe=false) or outbound (fromMe=true)
    const key = msgData.key as Record<string, unknown> | undefined;
    const fromMe = key?.fromMe === true;
    const direction = fromMe ? "outbound" : "inbound";
    const externalMessageId = (key?.id as string) || null;
    const remoteJid = (key?.remoteJid as string) || "";

    // Skip group messages and status broadcasts
    if (remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
      console.log(`[WA_INBOUND] SKIP group/broadcast jid=${remoteJid}`);
      return jsonRes({ received: true, ignored: true, reason: "group_or_broadcast" });
    }

    // Extract phone from JID
    const phone = normalizePhone(remoteJid.split("@")[0] || "");
    if (!phone || phone.length < 8) {
      console.warn(`[WA_INBOUND] Invalid phone from jid=${remoteJid}`);
      return jsonRes({ error: "Invalid phone" }, 400);
    }

    // Extract message content
    const { content, messageType, mediaUrl, mimeType, fileName } = extractMessageContent(msgData);

    // Extract push name for contact display
    const pushName = (msgData.pushName as string) || phone;
    const messageTimestamp = msgData.messageTimestamp
      ? new Date(Number(msgData.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    // --- DB operations ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Find workspace by instance_name
    const { data: qrConn, error: connErr } = await admin
      .from("whatsapp_qr_connections")
      .select("workspace_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (connErr || !qrConn) {
      console.warn(`[WA_INBOUND] WORKSPACE_NOT_FOUND instance=${instanceName}`);
      return jsonRes({ received: true, matched: false });
    }

    const workspaceId = qrConn.workspace_id;

    // 2. Idempotency: check if message already exists
    if (externalMessageId) {
      const { data: existing } = await admin
        .from("messages")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_message_id", externalMessageId)
        .maybeSingle();

      if (existing) {
        console.log(`[WA_INBOUND] DUPLICATE message=${externalMessageId}`);
        return jsonRes({ received: true, duplicate: true });
      }
    }

    // 3. Find or create lead by phone number
    let leadId: string | null = null;
    const { data: existingLead } = await admin
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Also try with + prefix
      const { data: leadWithPlus } = await admin
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("phone", `+${phone}`)
        .maybeSingle();

      if (leadWithPlus) {
        leadId = leadWithPlus.id;
      } else if (direction === "inbound") {
        // Create new lead for inbound messages from unknown numbers
        const { data: newLead, error: leadErr } = await admin
          .from("leads")
          .insert({
            workspace_id: workspaceId,
            name: pushName || phone,
            phone: phone,
            source: "whatsapp",
            status: "new",
          })
          .select("id")
          .single();

        if (leadErr) {
          console.error(`[WA_INBOUND] LEAD_CREATE_FAILED phone=${phone} error=${leadErr.message}`);
        } else {
          leadId = newLead.id;
          console.log(`[WA_INBOUND] LEAD_CREATED id=${leadId} phone=${phone}`);
        }
      }
    }

    // 4. Find or create conversation
    const { data: existingConv } = await admin
      .from("conversations")
      .select("id, unread_count")
      .eq("workspace_id", workspaceId)
      .eq("channel", "whatsapp")
      .eq("external_thread_id", phone)
      .maybeSingle();

    let conversationId: string;
    const now = new Date().toISOString();

    if (existingConv) {
      conversationId = existingConv.id;

      // Update conversation metadata
      const updatePayload: Record<string, unknown> = {
        last_message_at: messageTimestamp,
        last_message_preview: content.substring(0, 100),
        last_message_direction: direction,
        updated_at: now,
      };

      if (direction === "inbound") {
        updatePayload.unread_count = (existingConv.unread_count || 0) + 1;
        // Reopen if closed/archived
        updatePayload.status = "open";
      }

      // Update lead_id if we found one and conversation doesn't have one
      if (leadId) {
        updatePayload.lead_id = leadId;
      }

      await admin
        .from("conversations")
        .update(updatePayload)
        .eq("id", conversationId);
    } else {
      // Create new conversation
      const { data: newConv, error: convErr } = await admin
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          channel: "whatsapp",
          external_thread_id: phone,
          lead_id: leadId,
          status: "open",
          unread_count: direction === "inbound" ? 1 : 0,
          last_message_at: messageTimestamp,
          last_message_preview: content.substring(0, 100),
          last_message_direction: direction,
          channel_metadata: {
            phone: phone,
            push_name: pushName,
            source: "evolution_qr",
            instance_name: instanceName,
          },
        })
        .select("id")
        .single();

      if (convErr) {
        console.error(`[WA_INBOUND] CONV_CREATE_FAILED phone=${phone} error=${convErr.message}`);
        return jsonRes({ error: "Failed to create conversation" }, 500);
      }
      conversationId = newConv.id;
      console.log(`[WA_INBOUND] CONV_CREATED id=${conversationId} phone=${phone}`);
    }

    // 5. Insert message
    const attachments = mediaUrl
      ? [{ type: messageType, url: mediaUrl, name: fileName, mimeType }]
      : [];

    const { error: msgErr } = await admin
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        direction: direction,
        content: content,
        attachments: attachments,
        sender_id: fromMe ? null : null, // External sender, no internal user ID
        sent_at: messageTimestamp,
        external_message_id: externalMessageId,
      });

    if (msgErr) {
      console.error(`[WA_INBOUND] MSG_INSERT_FAILED conv=${conversationId} error=${msgErr.message}`);
      return jsonRes({ error: "Failed to insert message" }, 500);
    }

    console.log(`[WA_INBOUND] MSG_INSERTED conv=${conversationId} dir=${direction} type=${messageType} phone=${phone} workspace=${workspaceId}`);

    return jsonRes({
      received: true,
      processed: true,
      conversationId,
      direction,
      messageType,
    });
  } catch (error) {
    console.error("[WA_INBOUND] UNHANDLED_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
