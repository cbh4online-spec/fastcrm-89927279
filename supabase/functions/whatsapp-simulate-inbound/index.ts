// FastCRM WhatsApp Pro — Simulate inbound message (QA tool)
// Permite testar o fluxo end-to-end de webhooks sem provider real.
// Cria/atualiza conversa, mensagem inbound e log de webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SimulateBody {
  workspaceId: string;
  phone: string;
  contactName?: string;
  messageType?: "text" | "image" | "audio" | "document" | "video";
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = (await req.json()) as SimulateBody;
    if (!body.workspaceId || !body.phone) return json({ error: "workspaceId and phone required" }, 400);

    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", body.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "permission_denied" }, 403);

    const messageType = body.messageType ?? "text";
    const phone = body.phone.replace(/\D/g, "");
    const text = body.text ?? (messageType === "audio" ? "[Mensagem de voz]" : messageType === "image" ? "[Imagem]" : messageType === "document" ? "[Documento]" : "Mensagem de teste");

    // Resolver instance (logging)
    const { data: instance } = await admin
      .from("whatsapp_provider_instances")
      .select("id, provider_name")
      .eq("workspace_id", body.workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Log webhook simulado
    await admin.from("whatsapp_webhook_logs").insert({
      workspace_id: body.workspaceId,
      provider_instance_id: instance?.id ?? null,
      provider_name: instance?.provider_name ?? "mock",
      event_type: `simulated_${messageType}`,
      payload: { simulated: true, phone, text, messageType, mediaUrl: body.mediaUrl },
      headers: { "x-simulated": "true" },
      direction: "inbound",
      phone,
      processed: true,
    });

    // Encontrar/criar conversa
    let conversationId: string | null = null;
    const { data: existing } = await admin
      .from("conversations")
      .select("id, unread_count")
      .eq("workspace_id", body.workspaceId)
      .eq("channel", "whatsapp")
      .eq("external_thread_id", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      conversationId = existing.id as string;
      await admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: text.slice(0, 200),
          last_message_direction: "inbound",
          unread_count: ((existing.unread_count as number) ?? 0) + 1,
          status: "open",
        })
        .eq("id", conversationId);
    } else {
      const { data: created } = await admin
        .from("conversations")
        .insert({
          workspace_id: body.workspaceId,
          channel: "whatsapp",
          external_thread_id: phone,
          provider_instance_id: instance?.id ?? null,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: text.slice(0, 200),
          last_message_direction: "inbound",
          unread_count: 1,
          channel_metadata: { contact_name: body.contactName ?? null, simulated: true },
        })
        .select("id")
        .single();
      conversationId = created?.id ?? null;
    }

    if (!conversationId) return json({ error: "conversation_create_failed" }, 500);

    // Inserir mensagem inbound
    const externalId = `sim_${Date.now()}`;
    await admin.from("messages").insert({
      conversation_id: conversationId,
      workspace_id: body.workspaceId,
      direction: "inbound",
      content: text,
      message_type: messageType,
      media_url: body.mediaUrl ?? null,
      media_mime_type: body.mediaMimeType ?? null,
      external_message_id: externalId,
      provider_status: "delivered",
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      metadata: { simulated: true },
    });

    // Evento
    await admin.rpc("emit_whatsapp_event", {
      p_workspace_id: body.workspaceId,
      p_event_type: `whatsapp.${messageType === "audio" ? "audio" : messageType === "image" || messageType === "video" || messageType === "document" ? "media" : "message"}.received`,
      p_entity_type: "message",
      p_entity_id: null,
      p_conversation_id: conversationId,
      p_contact_id: null,
      p_payload: { simulated: true, message_type: messageType, phone },
    });

    return json({ ok: true, conversation_id: conversationId, external_message_id: externalId }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "internal_error", fallback: true }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
