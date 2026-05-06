import type {
  VoiceProviderAdapter,
  VoiceCapabilities,
  ClickToCallInput,
  ClickToCallResult,
  NormalizedCallEvent,
  ProviderRuntimeConfig,
  CostEstimateInput,
  CostEstimateResult,
} from "./types";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";

/**
 * SIP Adapter — placeholder estrutural.
 * Permite registo manual de credenciais SIP (futuro: Asterisk/FreePBX/SIP Trunk).
 * Campos esperados em settings: sip_domain, sip_username, sip_secret_name, outbound_proxy, trunk_name.
 */
class SipAdapter implements VoiceProviderAdapter {
  readonly name = "sip" as const;
  readonly capabilities: VoiceCapabilities = getDefaultCapabilities("sip");

  async testConnection(_config: ProviderRuntimeConfig) {
    return { ok: false, message: "Adapter SIP ainda não suporta operações reais. Configuração guardada para uso futuro." };
  }

  async clickToCall(_input: ClickToCallInput, _config: ProviderRuntimeConfig): Promise<ClickToCallResult> {
    return { success: false, status: "failed", message: "SIP click-to-call não disponível nesta fase." };
  }

  async endCall() { return { success: false, message: "SIP não suportado." }; }
  async getCallStatus() { return { status: "failed" as const }; }
  parseIncomingWebhook(): NormalizedCallEvent | null { return null; }
  parseStatusWebhook(): NormalizedCallEvent | null { return null; }
  parseRecordingWebhook(): NormalizedCallEvent | null { return null; }
  async getRecording() { return { status: "not_available" }; }
  estimateCost(input: CostEstimateInput): CostEstimateResult {
    return estimateCallCost(input);
  }
  getCapabilities() { return this.capabilities; }
  normalizePhoneNumber(number: string, country: string = "PT") {
    return normalizePhone(number, country);
  }
}

export const sipAdapter = new SipAdapter();
