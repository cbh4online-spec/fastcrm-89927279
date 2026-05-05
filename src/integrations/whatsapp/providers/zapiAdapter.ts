import { supabase } from "@/integrations/supabase/client";
import type {
  WhatsAppProviderAdapter,
  OutgoingMessagePayload,
  OutgoingMessageResult,
  NormalizedInboundMessage,
  NormalizedMessageStatus,
  WebhookValidationResult,
} from "./types";

/**
 * Z-API adapter (frontend).
 * O envio real acontece numa edge function dedicada (whatsapp-pro-send) que
 * conhece os tokens. Aqui apenas invocamos. Os parsers de webhook são usados
 * no servidor — estes implementations cliente são mantidos por completude.
 */
export const zapiAdapter: WhatsAppProviderAdapter = {
  name: "zapi",

  sendTextMessage: (p) => invokeSend(p),
  sendMediaMessage: (p) => invokeSend(p),
  sendAudioMessage: (p) => invokeSend(p),
  sendProductMessage: (p) => invokeSend(p),
  sendTemplateMessage: (p) => invokeSend(p),

  parseIncomingWebhook(raw): NormalizedInboundMessage | null {
    const r = raw as Record<string, unknown> | null;
    if (!r) return null;
    const phone = String(r.phone ?? r.from ?? "");
    if (!phone) return null;
    return {
      externalMessageId: String(r.messageId ?? r.id ?? `zapi_${Date.now()}`),
      externalThreadId: phone,
      fromPhone: phone,
      fromName: typeof r.senderName === "string" ? r.senderName : undefined,
      messageType: detectType(r),
      text: typeof (r.text as { message?: string } | undefined)?.message === "string"
        ? (r.text as { message?: string }).message
        : typeof r.body === "string"
        ? r.body
        : undefined,
      mediaUrl: typeof (r.image as { imageUrl?: string } | undefined)?.imageUrl === "string"
        ? (r.image as { imageUrl?: string }).imageUrl
        : typeof (r.audio as { audioUrl?: string } | undefined)?.audioUrl === "string"
        ? (r.audio as { audioUrl?: string }).audioUrl
        : undefined,
      receivedAt: new Date(),
      raw,
    };
  },

  parseMessageStatus(raw): NormalizedMessageStatus | null {
    const r = raw as Record<string, unknown> | null;
    if (!r?.messageId) return null;
    return {
      externalMessageId: String(r.messageId),
      status: (r.status as never) ?? "delivered",
      occurredAt: new Date(),
      raw,
    };
  },

  validateWebhook(): WebhookValidationResult {
    // Z-API não assina webhooks por defeito; validação é feita no servidor pelo segredo da instância.
    return { valid: true };
  },
};

function detectType(r: Record<string, unknown>): NormalizedInboundMessage["messageType"] {
  if (r.image) return "image";
  if (r.audio) return "audio";
  if (r.video) return "video";
  if (r.document) return "document";
  if (r.location) return "location";
  if (r.contact) return "contact_card";
  return "text";
}

async function invokeSend(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult> {
  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-pro-send", {
      body: payload,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return {
      success: !!data?.success,
      providerMessageId: data?.providerMessageId ?? null,
      rawResponse: data,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
