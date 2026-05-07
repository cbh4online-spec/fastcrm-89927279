// _shared/voice/types.ts — espelha src/integrations/voice/providers/types.ts
export type VoiceProviderName =
  | "mock" | "twilio" | "nvoip" | "threecx" | "sip"
  | "zenvia" | "totalvoice" | "vozio" | "voip_do_brasil" | "asterisk" | "other";

export type CallStatus =
  | "scheduled" | "initiated" | "ringing" | "answered" | "in_progress" | "completed"
  | "busy" | "no_answer" | "missed" | "failed" | "cancelled" | "recorded" | "transcribed";

export type CallEventType =
  | "call.initiated" | "call.ringing" | "call.answered" | "call.completed"
  | "call.missed" | "call.failed" | "recording.available" | "unknown";

export type CallDirection = "inbound" | "outbound" | "internal" | "missed" | "scheduled";

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
  detectedCapabilities?: Record<string, unknown>;
}

export type VoiceWebhookKind = "incoming" | "status" | "recording" | "auto";

export interface VoiceProviderAdapter {
  readonly name: VoiceProviderName;
  testConnection(config: ProviderRuntimeConfig): Promise<ConnectionTestResult>;
  clickToCall(input: ClickToCallInput, config: ProviderRuntimeConfig): Promise<ClickToCallResult>;
  getCallStatus(providerCallId: string, config: ProviderRuntimeConfig): Promise<{ status: CallStatus; raw?: unknown }>;
  parseWebhook(kind: VoiceWebhookKind, payload: unknown, headers: Record<string, string>, config: ProviderRuntimeConfig): NormalizedCallEvent | null;
  getRecording(providerCallId: string, config: ProviderRuntimeConfig): Promise<{ url?: string; status: string; durationSeconds?: number }>;
}

export function normalizeTwilioStatus(raw: string | undefined | null): CallStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "queued":
    case "initiated": return "initiated";
    case "ringing": return "ringing";
    case "in-progress":
    case "answered": return "in_progress";
    case "completed": return "completed";
    case "busy": return "busy";
    case "no-answer": return "no_answer";
    case "failed": return "failed";
    case "canceled":
    case "cancelled": return "cancelled";
    default: return "completed";
  }
}

export function normalizeGenericStatus(raw: string | undefined | null): CallStatus {
  const v = (raw ?? "").toLowerCase().replace(/[-\s]/g, "_");
  const allowed: CallStatus[] = [
    "scheduled","initiated","ringing","answered","in_progress","completed",
    "busy","no_answer","missed","failed","cancelled","recorded","transcribed",
  ];
  return (allowed.includes(v as CallStatus) ? v : "completed") as CallStatus;
}

export function statusToEvent(status: CallStatus): CallEventType {
  switch (status) {
    case "ringing":
    case "initiated": return "call.ringing";
    case "answered":
    case "in_progress": return "call.answered";
    case "completed": return "call.completed";
    case "no_answer":
    case "busy":
    case "missed": return "call.missed";
    case "failed":
    case "cancelled": return "call.failed";
    case "recorded": return "recording.available";
    default: return "unknown";
  }
}
