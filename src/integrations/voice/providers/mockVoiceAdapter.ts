import type {
  VoiceProviderAdapter,
  VoiceCapabilities,
  ClickToCallInput,
  ClickToCallResult,
  NormalizedCallEvent,
  CallStatus,
  ProviderRuntimeConfig,
  CostEstimateInput,
  CostEstimateResult,
} from "./types";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";
import { normalizeGenericStatus } from "../normalize/normalizeCallStatus";

class MockVoiceAdapter implements VoiceProviderAdapter {
  readonly name = "mock" as const;
  readonly capabilities: VoiceCapabilities = getDefaultCapabilities("mock");

  async testConnection() {
    return { ok: true, message: "Mock provider sempre disponível.", latencyMs: 1, detectedCapabilities: this.capabilities };
  }

  async clickToCall(input: ClickToCallInput, _config: ProviderRuntimeConfig): Promise<ClickToCallResult> {
    const startedAt = new Date();
    const duration = 30 + Math.floor(Math.random() * 151);
    const endedAt = new Date(startedAt.getTime() + duration * 1000);
    return {
      success: true,
      providerCallId: `mock_${crypto.randomUUID()}`,
      status: "completed",
      durationSeconds: duration,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      message: "Chamada simulada com sucesso (modo demonstração).",
      isMock: true,
      raw: { input, simulated: true },
    };
  }

  async endCall(providerCallId: string) {
    return { success: true, message: `Mock call ${providerCallId} terminada.` };
  }

  async getCallStatus(providerCallId: string): Promise<{ status: CallStatus; raw?: unknown }> {
    return { status: "completed", raw: { providerCallId, mock: true } };
  }

  parseIncomingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    return {
      providerCallId: String(p.call_id ?? `mock_${Date.now()}`),
      eventType: "call.initiated",
      direction: "inbound",
      status: normalizeGenericStatus((p.status as string) ?? "ringing"),
      fromNumber: p.from as string | undefined,
      toNumber: p.to as string | undefined,
      startedAt: (p.started_at as string) ?? new Date().toISOString(),
      raw: payload,
    };
  }

  parseStatusWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const status = normalizeGenericStatus(p.status as string);
    return {
      providerCallId: String(p.call_id ?? "unknown"),
      eventType: status === "completed" ? "call.completed" : "call.ringing",
      direction: (p.direction as NormalizedCallEvent["direction"]) ?? "outbound",
      status,
      durationSeconds: typeof p.duration === "number" ? p.duration : undefined,
      raw: payload,
    };
  }

  parseRecordingWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    return {
      providerCallId: String(p.call_id ?? "unknown"),
      eventType: "recording.available",
      direction: "outbound",
      status: "recorded",
      recordingUrl: p.recording_url as string | undefined,
      recordingProviderId: p.recording_id as string | undefined,
      recordingDurationSeconds: typeof p.recording_duration === "number" ? p.recording_duration : undefined,
      raw: payload,
    };
  }

  async getRecording() {
    return { status: "not_available" };
  }

  estimateCost(input: CostEstimateInput): CostEstimateResult {
    return estimateCallCost({ ...input, costPerMinute: input.costPerMinute ?? 0.02, currency: input.currency ?? "EUR" });
  }

  getCapabilities() {
    return this.capabilities;
  }

  normalizePhoneNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const mockVoiceAdapter = new MockVoiceAdapter();
