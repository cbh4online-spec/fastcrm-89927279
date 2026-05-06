/**
 * Zapy adapter — alias funcional do Z-API com diferenças de naming.
 * Mantém o mesmo contrato de envio (encaminhado para a edge function).
 * O backend resolve o naming via provider_name no `whatsapp_provider_instances`.
 */
import { zapiAdapter } from "./zapiAdapter";
import type { WhatsAppProviderAdapter } from "./types";

export const zapyAdapter: WhatsAppProviderAdapter = {
  ...zapiAdapter,
  name: "zapy",
};
