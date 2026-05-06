import type {
  CommunicationChannelAdapter,
  CommunicationChannelType,
  ChannelCapabilities,
  IncomingMessage,
  IncomingStatus,
  SendResult,
  OutgoingMessage,
  ConnectionTestResult,
} from "./types";

/**
 * Helper para criar adapters placeholder com capabilities declaradas
 * mas operações ainda em modo "preparado para integração futura".
 *
 * Mantém a arquitetura honesta: a UI sabe o que cada canal pode/não pode fazer,
 * mas não promete envios reais antes de existir provider implementado.
 */
export function createPlaceholderAdapter(
  type: CommunicationChannelType,
  capabilities: ChannelCapabilities,
  options: { ready?: boolean; reason?: string } = {}
): CommunicationChannelAdapter {
  const ready = options.ready ?? false;
  const reason =
    options.reason ?? "Canal preparado na arquitetura. Integração será activada numa próxima fase.";

  return {
    type,
    capabilities,

    async sendMessage(_payload: OutgoingMessage): Promise<SendResult> {
      if (!ready) {
        return {
          success: false,
          error: reason,
        };
      }
      return {
        success: true,
        externalMessageId: `${type}_${Date.now()}`,
      };
    },

    parseIncomingPayload(raw: unknown): IncomingMessage | null {
      const r = raw as Record<string, unknown> | null;
      if (!r) return null;
      return {
        channelType: type,
        externalMessageId: String(r.id ?? `${type}_${Date.now()}`),
        externalThreadId: String(r.thread_id ?? r.from ?? ""),
        from: String(r.from ?? ""),
        fromName: typeof r.from_name === "string" ? r.from_name : undefined,
        to: typeof r.to === "string" ? r.to : undefined,
        subject: typeof r.subject === "string" ? r.subject : undefined,
        messageType: (r.message_type as never) ?? "text",
        text: typeof r.text === "string" ? r.text : undefined,
        htmlContent: typeof r.html === "string" ? r.html : undefined,
        receivedAt: new Date(),
        raw,
      };
    },

    parseStatusPayload(raw: unknown): IncomingStatus | null {
      const r = raw as Record<string, unknown> | null;
      if (!r?.id) return null;
      return {
        channelType: type,
        externalMessageId: String(r.id),
        status: (r.status as never) ?? "delivered",
        occurredAt: new Date(),
        raw,
      };
    },

    async testConnection(): Promise<ConnectionTestResult> {
      return {
        ok: ready,
        message: ready ? "Canal disponível." : reason,
      };
    },

    getCapabilities() {
      return capabilities;
    },
  };
}
