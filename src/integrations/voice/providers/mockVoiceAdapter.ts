import type {
  VoiceProviderAdapter,
  VoiceCapabilities,
  ClickToCallInput,
  ClickToCallResult,
  NormalizedCallEvent,
  CallStatus,
} from "./types";
import { normalizePhone } from "../utils/phone";

/**
 * Mock voice provider — simula chamadas para testar UI sem fornecedor real.
 * UI deve indicar claramente "modo demonstração — chamada simulada".
 */
class MockVoiceAdapter implements VoiceProviderAdapter {
  readonly name = "mock" as const;
  readonly capabilities: VoiceCapabilities = {
    can_click_to_call: true,
    can_receive_calls: true,
    can_record: false,
    can_transcribe: false,
    can_webhook_status: true,
    can_manage_numbers: false,
    can_transfer: false,
  };

  async testConnection() {
    return { ok: true, message: "Mock provider sempre disponível.", latencyMs: 1 };
  }

  async clickToCall(input: ClickToCallInput): Promise<ClickToCallResult> {
    const startedAt = new Date();
    // duração aleatória 30–180s (resposta da pergunta clarificadora)
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

  parseIncomingCallWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    return {
      providerCallId: String(p.call_id ?? `mock_${Date.now()}`),
      direction: "inbound",
      status: (p.status as CallStatus) ?? "ringing",
      fromNumber: p.from as string | undefined,
      toNumber: p.to as string | undefined,
      startedAt: (p.started_at as string) ?? new Date().toISOString(),
      raw: payload,
    };
  }

  parseCallStatusWebhook(payload: unknown): NormalizedCallEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    return {
      providerCallId: String(p.call_id ?? "unknown"),
      direction: (p.direction as NormalizedCallEvent["direction"]) ?? "outbound",
      status: (p.status as CallStatus) ?? "completed",
      durationSeconds: typeof p.duration === "number" ? p.duration : undefined,
      raw: payload,
    };
  }

  async getRecording() {
    return { status: "not_available" };
  }

  getCapabilities() {
    return this.capabilities;
  }

  normalizeNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const mockVoiceAdapter = new MockVoiceAdapter();
