import type { WhatsAppProviderAdapter, WhatsAppProviderName } from "./types";
import { mockAdapter } from "./mockAdapter";
import { zapiAdapter } from "./zapiAdapter";
import { zapyAdapter } from "./zapyAdapter";

/**
 * Resolve o adapter correto a partir do nome do fornecedor.
 * Adicionar aqui novos fornecedores no futuro (meta_cloud_api, twilio, ...).
 */
export function getProviderAdapter(name: WhatsAppProviderName | string | null | undefined): WhatsAppProviderAdapter {
  const normalized = (name ?? "").toLowerCase().replace(/[-_]/g, "");
  switch (normalized) {
    case "zapi":
      return zapiAdapter;
    case "zapy":
      return zapyAdapter;
    case "mock":
      return mockAdapter;
    case "metacloudapi":
    case "twilio":
    case "other":
    default:
      // fallback: usa Z-API como default operacional. Mock só em testes.
      return zapiAdapter;
  }
}
