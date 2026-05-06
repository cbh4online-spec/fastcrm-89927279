import type { CommunicationChannelAdapter, ChannelCapabilities } from "./types";
import { createPlaceholderAdapter } from "./createPlaceholderAdapter";
import { getProviderAdapter } from "@/integrations/whatsapp/providers";

/**
 * WhatsApp adapter — bridge para a camada existente em src/integrations/whatsapp.
 *
 * NÃO duplica lógica. Reutiliza o WhatsApp provider adapter (Z-API/Zapy/Mock)
 * e expõe uma interface omnicanal uniforme.
 */
const WHATSAPP_CAPABILITIES: ChannelCapabilities = {
  can_send_text: true,
  can_send_media: true,
  can_receive_media: true,
  can_send_templates: true,
  can_track_read: true,
  can_track_delivery: true,
  can_receive_audio: true,
  can_make_calls: false,
  can_record_calls: false,
  can_transcribe: true, // via Fase 1D
  can_thread_messages: false,
};

export const whatsappChannelAdapter: CommunicationChannelAdapter = {
  type: "whatsapp",
  capabilities: WHATSAPP_CAPABILITIES,

  async sendMessage(payload) {
    // Resolve provider WhatsApp existente (Z-API/Zapy/Mock)
    const providerName =
      typeof payload.metadata?.provider_name === "string"
        ? payload.metadata.provider_name
        : "zapi";
    const provider = getProviderAdapter(providerName);

    const result = await provider.sendTextMessage({
      workspaceId: payload.workspaceId,
      conversationId: payload.conversationId ?? null,
      contactId: payload.contactId ?? null,
      phone: payload.to,
      messageType: "text",
      text: payload.text,
      mediaUrl: payload.mediaUrl,
      mediaMimeType: payload.mediaMimeType,
      productId: payload.productId,
      templateId: payload.templateId,
      metadata: payload.metadata,
    });

    return {
      success: result.success,
      externalMessageId: result.providerMessageId ?? null,
      error: result.error,
      rawResponse: result.rawResponse,
    };
  },

  parseIncomingPayload(raw) {
    // O parsing real é feito por src/integrations/whatsapp/normalize/normalizeIncomingMessage.ts
    // Aqui só fornecemos um shape genérico para fluxos omnicanal.
    const r = raw as Record<string, unknown> | null;
    if (!r) return null;
    return {
      channelType: "whatsapp",
      externalMessageId: String(r.id ?? `wa_${Date.now()}`),
      externalThreadId: String(r.from ?? ""),
      from: String(r.from ?? ""),
      fromName: typeof r.name === "string" ? r.name : undefined,
      messageType: "text",
      text: typeof r.text === "string" ? r.text : undefined,
      receivedAt: new Date(),
      raw,
    };
  },

  parseStatusPayload(raw) {
    const r = raw as Record<string, unknown> | null;
    if (!r?.id) return null;
    return {
      channelType: "whatsapp",
      externalMessageId: String(r.id),
      status: (r.status as never) ?? "delivered",
      occurredAt: new Date(),
      raw,
    };
  },

  async testConnection() {
    return { ok: true, message: "WhatsApp Pro está configurado neste workspace." };
  },

  getCapabilities() {
    return WHATSAPP_CAPABILITIES;
  },
};

// ─── Adapters preparados para fases futuras ────────────────────────────

export const emailChannelAdapter = createPlaceholderAdapter(
  "email",
  {
    can_send_text: true,
    can_send_media: true,
    can_receive_media: true,
    can_send_templates: true,
    can_track_read: true,
    can_track_delivery: false,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: true,
  },
  { ready: false, reason: "Integração Gmail/Outlook prevista para próxima fase." }
);

export const instagramChannelAdapter = createPlaceholderAdapter(
  "instagram_dm",
  {
    can_send_text: true,
    can_send_media: true,
    can_receive_media: true,
    can_send_templates: false,
    can_track_read: true,
    can_track_delivery: true,
    can_receive_audio: true,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: false, reason: "Integração Instagram Business prevista para próxima fase." }
);

export const facebookChannelAdapter = createPlaceholderAdapter(
  "facebook_messenger",
  {
    can_send_text: true,
    can_send_media: true,
    can_receive_media: true,
    can_send_templates: false,
    can_track_read: true,
    can_track_delivery: true,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: false, reason: "Integração Meta Page prevista para próxima fase." }
);

export const websiteChatChannelAdapter = createPlaceholderAdapter(
  "website_chat",
  {
    can_send_text: true,
    can_send_media: true,
    can_receive_media: false,
    can_send_templates: false,
    can_track_read: true,
    can_track_delivery: true,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: true, reason: "Endpoint de chat disponível; widget completo na Fase 1M." }
);

export const websiteFormChannelAdapter = createPlaceholderAdapter(
  "website_form",
  {
    can_send_text: false,
    can_send_media: false,
    can_receive_media: true,
    can_send_templates: false,
    can_track_read: false,
    can_track_delivery: false,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: true, reason: "Endpoint de formulários disponível para receber submissões." }
);

export const phoneChannelAdapter = createPlaceholderAdapter(
  "phone",
  {
    can_send_text: false,
    can_send_media: false,
    can_receive_media: false,
    can_send_templates: false,
    can_track_read: false,
    can_track_delivery: false,
    can_receive_audio: true,
    can_make_calls: true,
    can_record_calls: true,
    can_transcribe: true,
    can_thread_messages: false,
  },
  { ready: false, reason: "Integração VoIP prevista para próxima fase." }
);

export const smsChannelAdapter = createPlaceholderAdapter(
  "sms",
  {
    can_send_text: true,
    can_send_media: false,
    can_receive_media: false,
    can_send_templates: false,
    can_track_read: false,
    can_track_delivery: true,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: false, reason: "Integração Twilio SMS prevista para próxima fase." }
);

export const telegramChannelAdapter = createPlaceholderAdapter(
  "telegram",
  {
    can_send_text: true,
    can_send_media: true,
    can_receive_media: true,
    can_send_templates: false,
    can_track_read: false,
    can_track_delivery: true,
    can_receive_audio: true,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: false, reason: "Bot Telegram já existe no projeto; integração omnicanal próxima fase." }
);

export const manualChannelAdapter = createPlaceholderAdapter(
  "manual",
  {
    can_send_text: true,
    can_send_media: false,
    can_receive_media: false,
    can_send_templates: false,
    can_track_read: false,
    can_track_delivery: false,
    can_receive_audio: false,
    can_make_calls: false,
    can_record_calls: false,
    can_transcribe: false,
    can_thread_messages: false,
  },
  { ready: true, reason: "Notas e interações manuais registadas no histórico." }
);
