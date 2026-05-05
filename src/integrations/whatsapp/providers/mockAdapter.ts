import type {
  WhatsAppProviderAdapter,
  OutgoingMessagePayload,
  OutgoingMessageResult,
  NormalizedInboundMessage,
  NormalizedMessageStatus,
  WebhookValidationResult,
} from "./types";

/**
 * Mock adapter — usado em desenvolvimento e demos.
 * Simula respostas com sucesso e gera IDs falsos.
 */
export const mockAdapter: WhatsAppProviderAdapter = {
  name: "mock",

  async sendTextMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult> {
    return mockSend("text", payload);
  },
  async sendMediaMessage(payload) {
    return mockSend("media", payload);
  },
  async sendAudioMessage(payload) {
    return mockSend("audio", payload);
  },
  async sendProductMessage(payload) {
    return mockSend("product", payload);
  },
  async sendTemplateMessage(payload) {
    return mockSend("template", payload);
  },

  parseIncomingWebhook(raw): NormalizedInboundMessage | null {
    const r = raw as Record<string, unknown> | null;
    if (!r) return null;
    return {
      externalMessageId: String(r.id ?? `mock_${Date.now()}`),
      externalThreadId: String(r.from ?? "351900000000"),
      fromPhone: String(r.from ?? "351900000000"),
      fromName: typeof r.name === "string" ? r.name : undefined,
      messageType: (r.type as never) ?? "text",
      text: typeof r.text === "string" ? r.text : undefined,
      receivedAt: new Date(),
      raw,
    };
  },

  parseMessageStatus(raw): NormalizedMessageStatus | null {
    const r = raw as Record<string, unknown> | null;
    if (!r?.id) return null;
    return {
      externalMessageId: String(r.id),
      status: (r.status as never) ?? "delivered",
      occurredAt: new Date(),
      raw,
    };
  },

  validateWebhook(): WebhookValidationResult {
    return { valid: true };
  },
};

function mockSend(kind: string, payload: OutgoingMessagePayload): OutgoingMessageResult {
  // eslint-disable-next-line no-console
  console.info("[mockAdapter] send", kind, { phone: payload.phone, type: payload.messageType });
  return {
    success: true,
    providerMessageId: `mock_${kind}_${Date.now()}`,
  };
}
