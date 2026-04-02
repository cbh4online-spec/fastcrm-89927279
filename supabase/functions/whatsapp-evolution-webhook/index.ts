import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const event = body?.event;
    const instanceName = body?.instance || body?.data?.instance;

    console.log(`[WA_WEBHOOK] event=${event} instance=${instanceName} raw=${JSON.stringify(body).substring(0, 600)}`);

    if (!event || !instanceName) {
      return jsonRes({ received: true, ignored: true });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find workspace for this instance
    const { data: conn } = await admin
      .from("whatsapp_qr_connections")
      .select("workspace_id, id, status")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (!conn) {
      console.warn(`[WA_WEBHOOK] NO_CONN instance=${instanceName}`);
      return jsonRes({ received: true, matched: false });
    }

    const workspaceId = conn.workspace_id;
    const now = new Date().toISOString();

    // ── connection.update / CONNECTION_UPDATE ──
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const rawState = body?.data?.state || body?.state;
      console.log(`[WA_WEBHOOK] CONNECTION state=${rawState} ws=${workspaceId}`);

      const update: Record<string, unknown> = { updated_at: now, last_health_check_at: now, last_seen_at: now };
      let mappedStatus: string;

      if (rawState === "open" || rawState === "connected") {
        mappedStatus = "connected";
        update.connected_at = now;
        update.sync_health = "active";
        update.recovery_state = "none";
        update.recovery_attempt_count = 0;
        update.last_error = null;
        update.sync_issue_reason = null;
        update.disconnected_at = null;

        // Extract phone
        let phone = body?.data?.owner || body?.data?.wuid;
        if (phone?.includes("@")) phone = phone.split("@")[0];
        if (phone) update.phone_number = phone;
      } else if (rawState === "close" || rawState === "disconnected") {
        mappedStatus = "disconnected";
        update.disconnected_at = now;
        update.sync_health = "suspended";
        update.sync_issue_reason = "Conexão encerrada";
      } else if (rawState === "connecting") {
        mappedStatus = "reconnecting";
      } else {
        mappedStatus = conn.status;
      }
      update.status = mappedStatus;

      await admin.from("whatsapp_qr_connections").update(update).eq("workspace_id", workspaceId);

      // Sync whatsapp_connections table
      if (mappedStatus === "connected") {
        await admin.from("whatsapp_connections").upsert({
          workspace_id: workspaceId, is_active: true,
          display_phone_number: update.phone_number || null, updated_at: now,
        }, { onConflict: "workspace_id" });
      } else if (mappedStatus === "disconnected") {
        await admin.from("whatsapp_connections").update({ is_active: false, updated_at: now })
          .eq("workspace_id", workspaceId);
      }

      return jsonRes({ received: true, status: mappedStatus });
    }

    // ── QRCODE_UPDATED ──
    if (event === "QRCODE_UPDATED" || event === "qrcode.updated") {
      const qr = body?.data?.qrcode?.base64 || body?.data?.base64;
      if (qr) {
        await admin.from("whatsapp_qr_connections").update({
          qr_code: qr, qr_updated_at: now, status: "qr_pending", updated_at: now,
        }).eq("workspace_id", workspaceId);
        console.log(`[WA_WEBHOOK] QR_UPDATED ws=${workspaceId}`);
      }
      return jsonRes({ received: true });
    }

    // ── MESSAGES_UPSERT / messages.upsert ──
    if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
      const rawMessages = Array.isArray(body?.data) ? body.data : [body?.data];

      for (const msg of rawMessages) {
        if (!msg) continue;

        const key = msg.key || {};
        const isFromMe = key.fromMe === true;
        const remoteJid: string = key.remoteJid || "";
        const messageId: string = key.id || "";

        // Skip status broadcasts and group messages for now
        if (remoteJid === "status@broadcast" || remoteJid.endsWith("@g.us")) continue;
        if (!messageId) continue;

        const phone = remoteJid.replace("@s.whatsapp.net", "");
        const direction = isFromMe ? "outbound" : "inbound";

        // Extract content
        const msgObj = msg.message || {};
        const content =
          msgObj.conversation ||
          msgObj.extendedTextMessage?.text ||
          msgObj.imageMessage?.caption ||
          msgObj.videoMessage?.caption ||
          msgObj.documentMessage?.fileName ||
          (msgObj.audioMessage ? "[áudio]" : null) ||
          (msgObj.stickerMessage ? "[sticker]" : null) ||
          (msgObj.imageMessage ? "[imagem]" : null) ||
          (msgObj.videoMessage ? "[vídeo]" : null) ||
          (msgObj.documentMessage ? "[documento]" : null) ||
          (msgObj.contactMessage ? "[contacto]" : null) ||
          (msgObj.locationMessage ? "[localização]" : null) ||
          "[mensagem]";

        // Dedup check
        const { data: existing } = await admin
          .from("messages")
          .select("id")
          .eq("external_message_id", messageId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (existing) continue;

        // Find or create conversation
        const externalThreadId = `wa_${phone}`;
        let { data: conversation } = await admin
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("external_thread_id", externalThreadId)
          .maybeSingle();

        if (!conversation) {
          // Try to match lead by phone
          const { data: lead } = await admin
            .from("leads")
            .select("id")
            .eq("workspace_id", workspaceId)
            .or(`phone.eq.${phone},phone.eq.+${phone}`)
            .maybeSingle();

          const { data: newConv } = await admin
            .from("conversations")
            .insert({
              workspace_id: workspaceId,
              channel: "whatsapp",
              external_thread_id: externalThreadId,
              lead_id: lead?.id || null,
              status: "open",
              last_message_at: now,
              channel_metadata: { phone, instanceName },
            })
            .select("id")
            .single();

          conversation = newConv;
        }

        if (!conversation) {
          console.error(`[WA_WEBHOOK] CONV_CREATE_FAILED phone=${phone}`);
          continue;
        }

        const sentAt = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : now;

        await admin.from("messages").insert({
          conversation_id: conversation.id,
          workspace_id: workspaceId,
          direction,
          content,
          external_message_id: messageId,
          sent_at: sentAt,
        });

        // Update conversation metadata
        const convUpdate: Record<string, unknown> = {
          last_message_at: sentAt,
          last_message_preview: content.substring(0, 200),
          last_message_direction: direction,
          updated_at: now,
        };
        if (direction === "inbound") {
          // Increment unread count manually
          const { data: currentConv } = await admin
            .from("conversations")
            .select("unread_count")
            .eq("id", conversation.id)
            .single();
          convUpdate.unread_count = (currentConv?.unread_count || 0) + 1;
        }
        await admin.from("conversations").update(convUpdate).eq("id", conversation.id);

        // Update connection health
        const healthField = direction === "inbound"
          ? { last_inbound_message_at: now }
          : { last_outbound_message_at: now };

        await admin.from("whatsapp_qr_connections").update({
          ...healthField,
          last_seen_at: now,
          sync_health: "active",
          last_sync_at: now,
          last_successful_sync_at: now,
          sync_issue_reason: null,
          recovery_state: "none",
          updated_at: now,
        }).eq("workspace_id", workspaceId);

        console.log(`[WA_WEBHOOK] MSG dir=${direction} phone=${phone} conv=${conversation.id}`);
      }

      return jsonRes({ received: true, processed: true });
    }

    console.log(`[WA_WEBHOOK] UNHANDLED event=${event}`);
    return jsonRes({ received: true, ignored: true });
  } catch (error) {
    console.error("[WA_WEBHOOK] ERROR", error);
    // Always 200 to avoid Evolution API retries
    return jsonRes({ received: true, error: true });
  }
});
