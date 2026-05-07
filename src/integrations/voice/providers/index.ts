import type { VoiceProviderAdapter, VoiceProviderName, ProviderRuntimeConfig } from "./types";
import { mockVoiceAdapter } from "./mockVoiceAdapter";
import { twilioVoiceAdapter } from "./twilioVoiceAdapter";
import { nvoipAdapter } from "./nvoipAdapter";
import { threecxAdapter } from "./threecxAdapter";
import { sipAdapter } from "./sipAdapter";
import { normalizePhone } from "../utils/phone";
import { getDefaultCapabilities } from "../utils/providerCapabilities";
import { estimateCallCost } from "../utils/costEstimator";

/**
 * Placeholders para providers ainda não suportados. Implementação futura na Fase 1Q+.
 */
function placeholder(name: VoiceProviderName): VoiceProviderAdapter {
  return {
    name,
    capabilities: getDefaultCapabilities(name),
    async testConnection() { return { ok: false, message: `Adapter ${name} não implementado.` }; },
    async clickToCall() { return { success: false, status: "failed", message: `Provider ${name} não suportado.` }; },
    async endCall() { return { success: false }; },
    async getCallStatus() { return { status: "failed" as const }; },
    parseIncomingWebhook() { return null; },
    parseStatusWebhook() { return null; },
    parseRecordingWebhook() { return null; },
    async getRecording() { return { status: "not_available" }; },
    estimateCost(input) { return estimateCallCost(input); },
    getCapabilities() { return this.capabilities; },
    normalizePhoneNumber(num, country = "PT") { return normalizePhone(num, country); },
  };
}

const ADAPTERS: Record<VoiceProviderName, VoiceProviderAdapter> = {
  mock: mockVoiceAdapter,
  twilio: twilioVoiceAdapter,
  nvoip: nvoipAdapter,
  threecx: threecxAdapter,
  sip: sipAdapter,
  zenvia: placeholder("zenvia"),
  totalvoice: placeholder("totalvoice"),
  vozio: placeholder("vozio"),
  voip_do_brasil: placeholder("voip_do_brasil"),
  asterisk: placeholder("asterisk"),
  other: placeholder("other"),
};

export function getVoiceAdapter(name: VoiceProviderName): VoiceProviderAdapter {
  return ADAPTERS[name] ?? mockVoiceAdapter;
}

export function listVoiceAdapters(): VoiceProviderAdapter[] {
  return Object.values(ADAPTERS);
}

export { mockVoiceAdapter, twilioVoiceAdapter, nvoipAdapter, threecxAdapter, sipAdapter };
export type { VoiceProviderAdapter, VoiceProviderName, ProviderRuntimeConfig } from "./types";
