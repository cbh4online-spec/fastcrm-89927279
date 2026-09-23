// FastCRM WhatsApp Pro — Sender abstracto
// Recebe payload normalizado, escolhe provider activo do workspace e envia.
// Por agora, encaminha para Z-API (whatsapp-zapi-send) quando o provider é zapi.
// Estrutura preparada para futuros adapters server-side (Meta Cloud, Twilio).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signWorkerRequest, verifyWorkerRequest } from "../_shared/sdr-engine/workerAuth.ts";
import { consumeWorkerDispatch, parseSdrBinding } from "../_shared/sdr-engine/transportGuard.ts";

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
  groupId?: string | null;
  messageType: string;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  fileName?: string;
  ptt?: boolean;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
  ctaPrompt?: string | null;
  productId?: string;
  templateId?: string;
  templateVariables?: Record<string, string | number>;
  buttons?: { id?: string; type?: string; label: string; url?: string }[];
  buttonHeader?: string;
  buttonFooter?: string;
  delayMessage?: number;
  metadata?: Record<string, unknown>;
  /** Modo worker: instância explícita da campanha; recusa se diferente da activa. */
  expectedInstanceId?: string | null;
  /** Modo worker: vínculo ao despacho SDR (obrigatório). */
  sdr?: { attemptId?: string; dispatchNo?: number };
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

    const rawBody = await req.text();
    const workerEnv = { enabled: Deno.env.get("SDR_AUTONOMOUS_SEND_ENABLED"), secret: Deno.env.get("SDR_WORKER_SECRET") };
    const worker = await verifyWorkerRequest((h) => req.headers.get(h), rawBody, workerEnv);
    if (!worker.ok && worker.present) return json({ error: "worker_unauthorized", reason: worker.reason }, 401);

    const body = JSON.parse(rawBody) as SendPayload;

    if (!body.workspaceId || !body.messageType || (!body.phone && !body.groupId && !body.conversationId)) {
      return json({ error: "workspace_id, messageType e (phone | groupId | conversationId) são obrigatórios" }, 400);
    }

    if (worker.ok) {
      // Worker SDR: sem utilizador; workspace assinado tem de coincidir e só texto 1:1.
      if (worker.workspaceId !== body.workspaceId) return json({ error: "worker_workspace_mismatch" }, 403);
      if (body.groupId || body.messageType !== "text" || !body.expectedInstanceId || !body.phone ||
          body.mediaUrl || body.ctaUrl || body.buttons?.length || body.productId || body.templateId) {
        return json({ error: "worker_payload_not_allowed" }, 400);
      }
      if (body.conversationId) {
        const { data: conv } = await adminClient.from("conversations").select("id")
          .eq("id", body.conversationId).eq("workspace_id", body.workspaceId).maybeSingle();
        if (!conv) return json({ error: "conversation_not_in_workspace" }, 403);
      }
      const consumed = await consumeWorkerDispatch(adminClient, {
        workspaceId: body.workspaceId, binding: parseSdrBinding(body.sdr), stage: "whatsapp-pro-send", channel: "whatsapp", recipient: body.phone,
      });
      if (!consumed.ok) return json({ error: "worker_dispatch_rejected", reason: (consumed as { reason: string }).reason }, 409);
    } else {
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
      const userId = userData.user.id;

      // Verificar membership (com bypass de super_admin)
      const { data: member } = await adminClient
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", body.workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      let isSuperAdmin = false;
      if (!member) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile?.id) {
          const { data: roles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);
          isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
        }
        if (!isSuperAdmin) {
          return json({ error: "Sem permissão neste workspace" }, 403);
        }
      }
    }

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
    if (worker.ok && instance.id !== body.expectedInstanceId) {
      return json({ error: "worker_instance_mismatch" }, 403);
    }

    // Encaminhamento para whatsapp-zapi-send: utilizador reencaminha o JWT; worker reassina.
    const forwardHeaders = async (payload: Record<string, unknown>): Promise<Record<string, string>> => {
      if (!worker.ok) return { Authorization: authHeader };
      return { Authorization: `Bearer ${serviceKey}`, ...(await signWorkerRequest(workerEnv.secret!, body.workspaceId, JSON.stringify(payload))) };
    };

    // Encaminha conforme adapter
    const provider = (instance.provider_name as string) ?? "zapi";

    let result: { success: boolean; providerMessageId?: string | null; error?: string };

    if (provider === "zapi" || provider === "zapy") {
      // Reutiliza a função existente, mas em formato adaptado.
      const invokePayload: Record<string, unknown> = {
        phone: body.phone || undefined,
        groupId: body.groupId || undefined,
        conversationId: body.conversationId ?? undefined,
        message: body.text,
        delayMessage: body.delayMessage,
      };
      const validCtaUrl = body.ctaUrl && /^https?:\/\//i.test(body.ctaUrl) ? body.ctaUrl : null;
      if (body.buttons?.length) {
        invokePayload.buttons = body.buttons;
        if (body.buttonHeader) invokePayload.buttonHeader = body.buttonHeader;
        if (body.buttonFooter) invokePayload.buttonFooter = body.buttonFooter;
      } else if (!body.mediaUrl && validCtaUrl) {
        invokePayload.buttons = [{ id: "buy_now", type: "URL", label: body.ctaLabel || "Comprar Agora", url: validCtaUrl }];
        invokePayload.buttonHeader = body.messageType === "product" ? "Produto" : undefined;
      }
      if (body.mediaUrl) {
        // "product" é tratado como imagem (a mediaUrl é sempre a imagem do produto),
        // garantindo que o caption (texto promocional) é entregue junto da imagem.
        const mediaType =
          body.messageType === "image" || body.messageType === "product"
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
          ...(mediaType === "audio" && body.ptt ? { ptt: true } : {}),
        };
        if (validCtaUrl && !body.buttons?.length) {
          invokePayload.buttons = [{ id: "buy_now", type: "URL", label: body.ctaLabel || "Comprar Agora", url: validCtaUrl }];
          invokePayload.buttonHeader = body.text;
        }
        // Quando vai como media com caption, não duplicar como mensagem de texto separada.
        delete invokePayload.message;
      }

      const zapiBody = { workspaceId: body.workspaceId, ...invokePayload, ...(worker.ok ? { sdr: body.sdr } : {}) };
      const { data: sendData, error: sendErr } = await adminClient.functions.invoke(
        "whatsapp-zapi-send",
        {
          body: zapiBody,
          headers: await forwardHeaders(zapiBody),
        },
      );

      if (sendErr) {
        result = { success: false, error: sendErr.message };
      } else if (sendData?.error) {
        result = { success: false, error: sendData.error };
      } else {
        if (body.mediaUrl && validCtaUrl) {
          const ctaPrompt =
            (body.ctaPrompt && body.ctaPrompt.trim().slice(0, 120)) ||
            "👇 Toque no botão para abrir a página segura do produto.";
          const ctaBody = {
            workspaceId: body.workspaceId,
            phone: body.phone,
            conversationId: body.conversationId ?? undefined,
            message: ctaPrompt,
            buttons: [{ id: "buy_now", type: "URL", label: body.ctaLabel || "Comprar Agora", url: validCtaUrl }],
          };
          await adminClient.functions.invoke("whatsapp-zapi-send", {
            body: ctaBody,
            headers: await forwardHeaders(ctaBody),
          });
        }
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
