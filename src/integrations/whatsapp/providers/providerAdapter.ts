import type { WhatsAppProviderAdapter, WhatsAppProviderName } from "./types";
import { mockAdapter } from "./mockAdapter";
import { zapiAdapter } from "./zapiAdapter";

/**
 * Resolve o adapter correto a partir do nome do fornecedor.
 * Adicionar aqui novos fornecedores no futuro (meta_cloud_api, twilio, ...).
 */
export function getProviderAdapter(name: WhatsAppProviderName | string | null | undefined): WhatsAppProviderAdapter {
  switch (name) {
    case "zapi":
    case "zapy":
      return zapiAdapter;
    case "mock":
      return mockAdapter;
    case "meta_cloud_api":
    case "twilio":
    case "other":
    default:
      // fallback: usa Z-API como default operacional. Mock só em testes.
      return zapiAdapter;
  }
}
