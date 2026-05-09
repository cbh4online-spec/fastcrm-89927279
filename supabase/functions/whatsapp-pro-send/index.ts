// FastCRM WhatsApp Pro — Sender abstracto
// Recebe payload normalizado, escolhe provider activo do workspace e envia.
// Por agora, encaminha para Z-API (whatsapp-zapi-send) quando o provider é zapi.
// Estrutura preparada para futuros adapters server-side (Meta Cloud, Twilio).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendPayload {
  workspaceId: string;
  conversationId?: string | null;
  contactId?: string | null;
  phone: string;
  messageType: string;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  fileName?: string;
  productId?: string;
  templateId?: string;
  templateVariables?: Record<string, string | number>;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = (await req.json()) as SendPayload;

    if (!body.workspaceId || !body.phone || !body.messageType) {
      return json({ error: "workspace_id, phone e messageType são obrigatórios" }, 400);
    }

    // Verificar membership
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", body.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "Sem permissão neste workspace" }, 403);

    // Garantir provider_instance
    const { data: instanceId, error: rpcErr } = await adminClient.rpc(
      "ensure_whatsapp_provider_instance",
      { p_workspace_id: body.workspaceId },
    );
    if (rpcErr) {
      return json({ error: rpcErr.message, fallback: true }, 200);
    }

    const { data: instance } = await adminClient
      .from("whatsapp_provider_instances")
      .select("id, provider_name, default_country_code, active")
      .eq("id", instanceId as string)
      .maybeSingle();

    if (!instance || !instance.active) {
      return json({ error: "WhatsApp Pro não está configurado neste workspace.", fallback: true }, 200);
    }

    // Encaminha conforme adapter
    const provider = (instance.provider_name as string) ?? "zapi";

    let result: { success: boolean; providerMessageId?: string | null; error?: string };

    if (provider === "zapi" || provider === "zapy") {
      // Reutiliza a função existente, mas em formato adaptado.
      const invokePayload: Record<string, unknown> = {
        phone: body.phone,
        conversationId: body.conversationId ?? undefined,
        message: body.text,
      };
      if (body.mediaUrl) {
        const mediaType =
          body.messageType === "image"
            ? "image"
            : body.messageType === "audio"
            ? "audio"
            : body.messageType === "video"
            ? "video"
            : "document";
        invokePayload.media = {
          type: mediaType,
          url: body.mediaUrl,
          caption: body.text,
          fileName: body.fileName,
        };
      }

      const { data: sendData, error: sendErr } = await adminClient.functions.invoke(
        "whatsapp-zapi-send",
        {
          body: { workspaceId: body.workspaceId, ...invokePayload },
          headers: { Authorization: authHeader },
        },
      );

      if (sendErr) {
        result = { success: false, error: sendErr.message };
      } else if (sendData?.error) {
        result = { success: false, error: sendData.error };
      } else {
        result = {
          success: !!sendData?.success,
          providerMessageId: sendData?.externalMessageId ?? null,
        };
      }
    } else {
      // Adapter futuro
      result = { success: false, error: `Provider ${provider} ainda não implementado server-side` };
    }

    // Log outbound (técnico) — não bloqueia
    const tEnd = Date.now();
    try {
      await adminClient.from("provider_request_logs").insert({
        workspace_id: body.workspaceId,
        provider_instance_id: instance.id,
        provider_name: provider,
        direction: "outbound",
        endpoint: `whatsapp:${body.messageType}`,
        request_payload: {
          phone: body.phone,
          message_type: body.messageType,
          has_media: !!body.mediaUrl,
          product_id: body.productId ?? null,
          template_id: body.templateId ?? null,
        },
        response_payload: {
          provider_message_id: result.providerMessageId ?? null,
          error: result.error ?? null,
        },
        status_code: result.success ? 200 : 500,
        success: result.success,
        error: result.success ? null : result.error,
        duration_ms: tEnd - (req.headers.get("x-request-start") ? Number(req.headers.get("x-request-start")) : tEnd),
      });
    } catch (_) { /* noop */ }

    if (!result.success) {
      return json({ error: result.error ?? "Falha ao enviar", fallback: true }, 200);
    }

    // Enriquecer mensagem persistida com metadata WhatsApp Pro (se já criada)
    if (result.providerMessageId) {
      await adminClient
        .from("messages")
        .update({
          message_type: body.messageType,
          media_url: body.mediaUrl ?? null,
          media_mime_type: body.mediaMimeType ?? null,
          product_id: body.productId ?? null,
          template_id: body.templateId ?? null,
          provider_status: "sent",
          metadata: body.metadata ?? {},
        })
        .eq("workspace_id", body.workspaceId)
        .eq("external_message_id", result.providerMessageId);
    }

    // Registar evento
    await adminClient.rpc("emit_whatsapp_event", {
      p_workspace_id: body.workspaceId,
      p_event_type: `whatsapp.message.${body.messageType === "product" ? "product_shared" : "sent"}`,
      p_entity_type: "message",
      p_entity_id: null,
      p_conversation_id: body.conversationId ?? null,
      p_contact_id: body.contactId ?? null,
      p_payload: {
        provider,
        provider_message_id: result.providerMessageId,
        message_type: body.messageType,
      },
    });

    return json({ success: true, providerMessageId: result.providerMessageId }, 200);
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
