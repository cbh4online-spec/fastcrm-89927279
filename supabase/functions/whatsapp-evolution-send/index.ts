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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonRes({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return jsonRes({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { workspaceId, phone, message, conversationId } = await req.json();
    if (!workspaceId || !message || (!phone && !conversationId)) {
      return jsonRes({ error: "workspaceId, message and (phone or conversationId) are required" }, 400);
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return jsonRes({ error: "Not a member of this workspace" }, 403);

    const serviceRole = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get active QR connection
    const { data: qrConn } = await serviceRole
      .from("whatsapp_qr_connections")
      .select("instance_name, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!qrConn || qrConn.status !== "connected") {
      return jsonRes({ error: "WhatsApp não está conectado. Conecte via QR nas Definições." }, 400);
    }

    // Resolve phone
    let targetPhone = phone;
    if (!targetPhone && conversationId) {
      const { data: conv } = await serviceRole
        .from("conversations")
        .select("external_thread_id, channel_metadata")
        .eq("id", conversationId)
        .single();
      if (conv) {
        targetPhone = (conv.channel_metadata as any)?.phone
          || conv.external_thread_id?.replace("wa_", "");
      }
    }
    if (!targetPhone) return jsonRes({ error: "Número de destino não encontrado" }, 400);

    const normalizedPhone = targetPhone.replace(/\D/g, "");
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return jsonRes({ error: "Número de telefone inválido" }, 400);
    }

    // Call Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!;
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
    const baseUrl = new URL(evolutionUrl.startsWith("http") ? evolutionUrl : `https://${evolutionUrl}`).origin;

    console.log(`[WA_SEND] to=${normalizedPhone} instance=${qrConn.instance_name} ws=${workspaceId}`);

    const evoRes = await fetch(`${baseUrl}/message/sendText/${qrConn.instance_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionKey },
      body: JSON.stringify({ number: normalizedPhone, text: message.trim() }),
    });

    const evoBody = await evoRes.text();
    if (!evoRes.ok) {
      console.error(`[WA_SEND] FAILED status=${evoRes.status} body=${evoBody}`);
      return jsonRes({ error: "Falha ao enviar mensagem via WhatsApp", details: evoBody }, 502);
    }

    let evoData: any = {};
    try { evoData = JSON.parse(evoBody); } catch { /* ok */ }
    const externalMsgId = evoData?.key?.id || evoData?.messageId || null;
    const now = new Date().toISOString();

    // Find or create conversation and save message
    let convId = conversationId;
    if (!convId) {
      const externalThreadId = `wa_${normalizedPhone}`;
      const { data: conv } = await serviceRole
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("external_thread_id", externalThreadId)
        .maybeSingle();

      if (conv) {
        convId = conv.id;
      } else {
        const { data: newConv } = await serviceRole
          .from("conversations")
          .insert({
            workspace_id: workspaceId, channel: "whatsapp",
            external_thread_id: externalThreadId, status: "open",
            last_message_at: now,
            channel_metadata: { phone: normalizedPhone, instanceName: qrConn.instance_name },
          })
          .select("id")
          .single();
        convId = newConv?.id;
      }
    }

    if (convId) {
      await serviceRole.from("messages").insert({
        conversation_id: convId,
        workspace_id: workspaceId,
        direction: "outbound",
        content: message.trim(),
        sender_id: userId,
        external_message_id: externalMsgId,
        sent_at: now,
      });

      await serviceRole.from("conversations").update({
        last_message_at: now,
        last_message_preview: message.trim().substring(0, 200),
        last_message_direction: "outbound",
        updated_at: now,
      }).eq("id", convId);
    }

    // Update connection health
    await serviceRole.from("whatsapp_qr_connections").update({
      last_outbound_message_at: now,
      last_seen_at: now,
      sync_health: "active",
      last_sync_at: now,
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    console.log(`[WA_SEND] OK phone=${normalizedPhone} msgId=${externalMsgId}`);
    return jsonRes({ success: true, messageId: externalMsgId, conversationId: convId });
  } catch (err) {
    console.error("[WA_SEND] ERROR:", err);
    return jsonRes({ error: err.message || "Internal error" }, 500);
  }
});
