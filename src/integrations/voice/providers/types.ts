/**
 * FastCRM VoiceHub — Voice Provider Adapter Types
 * Camada abstracta sobre fornecedores de voz (Nvoip, Twilio, 3CX, SIP, mock).
 * O frontend nunca menciona o fornecedor — apenas "VoiceHub".
 */

export type VoiceProviderName =
  | "mock"
  | "nvoip"
  | "twilio"
  | "zenvia"
  | "totalvoice"
  | "vozio"
  | "voip_do_brasil"
  | "threecx"
  | "asterisk"
  | "sip"
  | "other";

export type CallDirection = "inbound" | "outbound" | "internal" | "missed" | "scheduled";

export type CallType =
  | "phone_call"
  | "voip_call"
  | "whatsapp_call"
  | "whatsapp_video_call"
  | "video_meeting"
  | "voicemail"
  | "call_note";

export type CallStatus =
  | "scheduled"
  | "ringing"
  | "in_progress"
  | "completed"
  | "missed"
  | "failed"
  | "cancelled"
  | "no_answer"
  | "voicemail"
  | "transferred"
  | "recorded"
  | "transcribed";

export interface VoiceCapabilities {
  can_click_to_call: boolean;
  can_receive_calls: boolean;
  can_record: boolean;
  can_transcribe: boolean;
  can_webhook_status: boolean;
  can_manage_numbers: boolean;
  can_transfer: boolean;
}

export interface ClickToCallInput {
  workspaceId: string;
  fromNumber: string;
  toNumber: string;
  contactId?: string | null;
  context?: Record<string, unknown>;
}

export interface ClickToCallResult {
  success: boolean;
  providerCallId?: string;
  status: CallStatus;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
  message?: string;
  isMock?: boolean;
  raw?: unknown;
}

export interface NormalizedCallEvent {
  providerCallId: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber?: string;
  toNumber?: string;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  ringDurationSeconds?: number;
  recordingUrl?: string;
  raw: unknown;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface VoiceProviderAdapter {
  readonly name: VoiceProviderName;
  readonly capabilities: VoiceCapabilities;
  testConnection(): Promise<ConnectionTestResult>;
  clickToCall(input: ClickToCallInput): Promise<ClickToCallResult>;
  endCall(providerCallId: string): Promise<{ success: boolean; message?: string }>;
  getCallStatus(providerCallId: string): Promise<{ status: CallStatus; raw?: unknown }>;
  parseIncomingCallWebhook(payload: unknown): NormalizedCallEvent | null;
  parseCallStatusWebhook(payload: unknown): NormalizedCallEvent | null;
  getRecording(providerCallId: string): Promise<{ url?: string; status: string }>;
  getCapabilities(): VoiceCapabilities;
  normalizeNumber(number: string, country?: string): string;
}
