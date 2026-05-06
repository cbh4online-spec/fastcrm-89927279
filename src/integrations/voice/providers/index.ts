import type { VoiceProviderAdapter, VoiceProviderName } from "./types";
import { mockVoiceAdapter } from "./mockVoiceAdapter";

/**
 * Adapters reais (Nvoip, Twilio, 3CX, SIP) — placeholders estruturais.
 * Implementação real fica para Fase 1P (Voice Provider Integration).
 */
function createPlaceholderAdapter(name: VoiceProviderName): VoiceProviderAdapter {
  return {
    name,
    capabilities: {
      can_click_to_call: false,
      can_receive_calls: false,
      can_record: false,
      can_transcribe: false,
      can_webhook_status: false,
      can_manage_numbers: false,
      can_transfer: false,
    },
    async testConnection() {
      return { ok: false, message: `Adapter ${name} ainda não implementado (Fase 1P).` };
    },
    async clickToCall() {
      return {
        success: false,
        status: "failed",
        message: `Provider ${name} não suportado nesta fase. Use modo demonstração.`,
      };
    },
    async endCall() {
      return { success: false, message: `Provider ${name} não suportado.` };
    },
    async getCallStatus() {
      return { status: "failed" as const };
    },
    parseIncomingCallWebhook() {
      return null;
    },
    parseCallStatusWebhook() {
      return null;
    },
    async getRecording() {
      return { status: "not_available" };
    },
    getCapabilities() {
      return this.capabilities;
    },
    normalizeNumber(num: string) {
      return num;
    },
  };
}

const ADAPTERS: Record<VoiceProviderName, VoiceProviderAdapter> = {
  mock: mockVoiceAdapter,
  nvoip: createPlaceholderAdapter("nvoip"),
  twilio: createPlaceholderAdapter("twilio"),
  zenvia: createPlaceholderAdapter("zenvia"),
  totalvoice: createPlaceholderAdapter("totalvoice"),
  vozio: createPlaceholderAdapter("vozio"),
  voip_do_brasil: createPlaceholderAdapter("voip_do_brasil"),
  threecx: createPlaceholderAdapter("threecx"),
  asterisk: createPlaceholderAdapter("asterisk"),
  sip: createPlaceholderAdapter("sip"),
  other: createPlaceholderAdapter("other"),
};

export function getVoiceAdapter(name: VoiceProviderName): VoiceProviderAdapter {
  return ADAPTERS[name] ?? mockVoiceAdapter;
}

export function listVoiceAdapters(): VoiceProviderAdapter[] {
  return Object.values(ADAPTERS);
}

export { mockVoiceAdapter };
export type { VoiceProviderAdapter, VoiceProviderName } from "./types";
