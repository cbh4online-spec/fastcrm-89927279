/**
 * FastCRM Omnichannel Command Center — Channel Adapter Types
 *
 * Camada abstracta sobre todos os canais de comunicação.
 * O frontend nunca menciona o fornecedor — apenas o canal lógico.
 *
 * WhatsApp continua a usar `src/integrations/whatsapp/*` por baixo;
 * o `whatsappAdapter` deste módulo serve de bridge para essa camada.
 */

export type CommunicationChannelType =
  | "whatsapp"
  | "email"
  | "instagram_dm"
  | "facebook_messenger"
  | "website_chat"
  | "website_form"
  | "phone"
  | "sms"
  | "telegram"
  | "manual";

export type CommunicationChannelStatus =
  | "active"
  | "inactive"
  | "error"
  | "pending_setup"
  | "coming_soon";

export type CommunicationDirection = "inbound" | "outbound" | "internal" | "system";

export type CommunicationMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "product"
  | "template"
  | "email"
  | "form_submission"
  | "call_log"
  | "system_event"
  | "internal_note";

export interface ChannelCapabilities {
  can_send_text: boolean;
  can_send_media: boolean;
  can_receive_media: boolean;
  can_send_templates: boolean;
  can_track_read: boolean;
  can_track_delivery: boolean;
  can_receive_audio: boolean;
  can_make_calls: boolean;
  can_record_calls: boolean;
  can_transcribe: boolean;
  can_thread_messages: boolean;
}

export interface OutgoingMessage {
  workspaceId: string;
  channelType: CommunicationChannelType;
  conversationId?: string | null;
  contactId?: string | null;
  to: string; // phone, email, page id, etc.
  subject?: string;
  text?: string;
  htmlContent?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  attachments?: Array<{ url: string; mimeType?: string; fileName?: string }>;
  productId?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  externalMessageId?: string | null;
  error?: string;
  rawResponse?: unknown;
}

export interface IncomingMessage {
  channelType: CommunicationChannelType;
  externalMessageId: string;
  externalThreadId: string;
  from: string;
  fromName?: string;
  to?: string;
  subject?: string;
  messageType: CommunicationMessageType;
  text?: string;
  htmlContent?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  attachments?: Array<{ url: string; mimeType?: string; fileName?: string }>;
  receivedAt: Date;
  raw: unknown;
}

export interface IncomingStatus {
  channelType: CommunicationChannelType;
  externalMessageId: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "received";
  occurredAt: Date;
  raw: unknown;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface CommunicationChannelAdapter {
  readonly type: CommunicationChannelType;
  readonly capabilities: ChannelCapabilities;

  sendMessage(payload: OutgoingMessage): Promise<SendResult>;
  parseIncomingPayload(raw: unknown): IncomingMessage | null;
  parseStatusPayload(raw: unknown): IncomingStatus | null;
  testConnection(): Promise<ConnectionTestResult>;
  getCapabilities(): ChannelCapabilities;
}
