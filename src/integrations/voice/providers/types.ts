/**
 * FastCRM VoiceHub — Voice Provider Adapter Types (Fase 1P)
 * Camada abstracta sobre fornecedores de voz (Nvoip, Twilio, 3CX, SIP, mock).
 * O frontend nunca menciona o fornecedor — apenas "FastCRM VoiceHub".
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
  | "initiated"
  | "ringing"
  | "answered"
  | "in_progress"
  | "completed"
  | "busy"
  | "no_answer"
  | "missed"
  | "failed"
  | "cancelled"
  | "recorded"
  | "transcribed";

export type CallEventType =
  | "call.initiated"
  | "call.ringing"
  | "call.answered"
  | "call.completed"
  | "call.missed"
  | "call.failed"
  | "recording.available"
  | "unknown";

export type CapabilityValue = boolean | "depends_on_provider_config";

export interface VoiceCapabilities {
  can_click_to_call: CapabilityValue;
  can_receive_calls: CapabilityValue;
  can_record: CapabilityValue;
  can_transcribe: CapabilityValue;
  can_webhook_status: CapabilityValue;
  can_manage_numbers: CapabilityValue;
  can_transfer: CapabilityValue;
  can_estimate_cost: CapabilityValue;
}

/**
 * Configuração runtime do provider — passada para o adapter pela edge function.
 * Secrets já resolvidos a partir de api_*_secret_name.
 */
export interface ProviderRuntimeConfig {
  providerName: VoiceProviderName;
  providerInstanceId: string;
  workspaceId: string;
  baseUrl?: string | null;
  accountId?: string | null;
  apiKey?: string | null;
  apiToken?: string | null;
  authType?: string | null;
  webhookToken?: string | null;
  defaultCountry: string;
  defaultCountryCode: string;
  defaultCurrency: string;
  environment: "demo" | "sandbox" | "production";
  settings: Record<string, unknown>;
}

export interface ClickToCallInput {
  workspaceId: string;
  fromNumber: string;
  toNumber: string;
  contactId?: string | null;
  record?: boolean;
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
  parentProviderCallId?: string;
  eventType: CallEventType;
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
  recordingProviderId?: string;
  recordingDurationSeconds?: number;
  providerRawStatus?: string;
  raw: unknown;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  detectedCapabilities?: Partial<VoiceCapabilities>;
}

export interface CostEstimateInput {
  country: string;
  destinationType?: "fixed" | "mobile" | "toll_free" | "international" | "unknown";
  direction?: "inbound" | "outbound";
  durationSeconds?: number;
  costPerMinute?: number;
  connectionFee?: number;
  billingIncrementSeconds?: number;
  currency?: string;
}

export interface CostEstimateResult {
  amount: number | null;
  currency: string;
  breakdown?: Record<string, unknown>;
  message?: string;
}

export interface VoiceProviderAdapter {
  readonly name: VoiceProviderName;
  readonly capabilities: VoiceCapabilities;
  testConnection(config: ProviderRuntimeConfig): Promise<ConnectionTestResult>;
  clickToCall(input: ClickToCallInput, config: ProviderRuntimeConfig): Promise<ClickToCallResult>;
  endCall(providerCallId: string, config: ProviderRuntimeConfig): Promise<{ success: boolean; message?: string }>;
  getCallStatus(providerCallId: string, config: ProviderRuntimeConfig): Promise<{ status: CallStatus; raw?: unknown }>;
  parseIncomingWebhook(payload: unknown, headers: Record<string, string>, config: ProviderRuntimeConfig): NormalizedCallEvent | null;
  parseStatusWebhook(payload: unknown, headers: Record<string, string>, config: ProviderRuntimeConfig): NormalizedCallEvent | null;
  parseRecordingWebhook(payload: unknown, headers: Record<string, string>, config: ProviderRuntimeConfig): NormalizedCallEvent | null;
  getRecording(providerCallId: string, config: ProviderRuntimeConfig): Promise<{ url?: string; status: string; durationSeconds?: number }>;
  estimateCost(input: CostEstimateInput): CostEstimateResult;
  getCapabilities(): VoiceCapabilities;
  normalizePhoneNumber(number: string, country?: string): string;
}
