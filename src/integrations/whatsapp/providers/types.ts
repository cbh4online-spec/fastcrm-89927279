/**
 * FastCRM WhatsApp Pro — Provider Adapter Types
 *
 * Camada abstracta que isola o resto do FastCRM dos fornecedores
 * de WhatsApp (Z-API, Meta Cloud API, Twilio, Mock, etc.).
 *
 * O frontend nunca menciona o fornecedor — apenas "FastCRM WhatsApp Pro".
 */

export type WhatsAppProviderName = "zapi" | "zapy" | "meta_cloud_api" | "twilio" | "mock" | "other";

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "product"
  | "template"
  | "system"
  | "internal_note"
  | "location"
  | "contact_card";

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppProviderInstance {
  id: string;
  workspaceId: string;
  providerName: WhatsAppProviderName;
  displayName: string | null;
  defaultCountry: string;
  defaultCountryCode: string;
  active: boolean;
  metadata: Record<string, unknown>;
}

/** Payload normalizado de mensagem de saída (independente do fornecedor). */
export interface OutgoingMessagePayload {
  workspaceId: string;
  conversationId?: string | null;
  contactId?: string | null;
  phone: string; // E.164 ou nacional, normalizado a montante
  messageType: WhatsAppMessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  fileName?: string;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
  ctaPrompt?: string | null;
  productId?: string;
  templateId?: string;
  templateVariables?: Record<string, string | number>;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessageResult {
  success: boolean;
  providerMessageId?: string | null;
  error?: string;
  rawResponse?: unknown;
}

/** Mensagem inbound já normalizada (depois de parseIncomingWebhook). */
export interface NormalizedInboundMessage {
  externalMessageId: string;
  externalThreadId: string; // chat id / phone
  fromPhone: string;
  fromName?: string;
  messageType: WhatsAppMessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  receivedAt: Date;
  raw: unknown;
}

/** Atualização de estado de uma mensagem outbound. */
export interface NormalizedMessageStatus {
  externalMessageId: string;
  status: WhatsAppMessageStatus;
  occurredAt: Date;
  raw: unknown;
}

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
}

/** Interface única que cada adapter de fornecedor deve implementar. */
export interface WhatsAppProviderAdapter {
  readonly name: WhatsAppProviderName;

  sendTextMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult>;
  sendMediaMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult>;
  sendAudioMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult>;
  sendProductMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult>;
  sendTemplateMessage(payload: OutgoingMessagePayload): Promise<OutgoingMessageResult>;

  parseIncomingWebhook(raw: unknown): NormalizedInboundMessage | null;
  parseMessageStatus(raw: unknown): NormalizedMessageStatus | null;
  validateWebhook(headers: Record<string, string>, body: unknown, secret?: string): WebhookValidationResult;
}
