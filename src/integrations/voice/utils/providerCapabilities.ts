import type { VoiceCapabilities, VoiceProviderName } from "../providers/types";

export const DEFAULT_CAPABILITIES: Record<VoiceProviderName, VoiceCapabilities> = {
  mock: {
    can_click_to_call: true,
    can_receive_calls: true,
    can_record: true,
    can_transcribe: false,
    can_webhook_status: true,
    can_manage_numbers: false,
    can_transfer: false,
    can_estimate_cost: true,
  },
  twilio: {
    can_click_to_call: true,
    can_receive_calls: true,
    can_record: true,
    can_transcribe: true,
    can_webhook_status: true,
    can_manage_numbers: true,
    can_transfer: true,
    can_estimate_cost: true,
  },
  nvoip: {
    can_click_to_call: true,
    can_receive_calls: true,
    can_record: "depends_on_provider_config",
    can_transcribe: false,
    can_webhook_status: true,
    can_manage_numbers: true,
    can_transfer: "depends_on_provider_config",
    can_estimate_cost: true,
  },
  threecx: {
    can_click_to_call: true,
    can_receive_calls: true,
    can_record: "depends_on_provider_config",
    can_transcribe: false,
    can_webhook_status: true,
    can_manage_numbers: false,
    can_transfer: true,
    can_estimate_cost: false,
  },
  sip: {
    can_click_to_call: false,
    can_receive_calls: false,
    can_record: false,
    can_transcribe: false,
    can_webhook_status: false,
    can_manage_numbers: false,
    can_transfer: false,
    can_estimate_cost: false,
  },
  zenvia: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
  totalvoice: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
  vozio: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
  voip_do_brasil: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
  asterisk: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
  other: { can_click_to_call: false, can_receive_calls: false, can_record: false, can_transcribe: false, can_webhook_status: false, can_manage_numbers: false, can_transfer: false, can_estimate_cost: false },
};

export function getDefaultCapabilities(name: VoiceProviderName): VoiceCapabilities {
  return DEFAULT_CAPABILITIES[name] ?? DEFAULT_CAPABILITIES.other;
}
