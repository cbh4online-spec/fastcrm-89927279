import { z } from "zod";
import { errorResult } from "../supabaseClient";
import { McpWhatsAppError } from "./policy";

/** Schema comum de destino + workspace para as ferramentas WhatsApp MCP. */
export const whatsappTargetSchema = {
  workspace_id: z.string().uuid().describe("ID do workspace (ver list_workspaces)."),
  phone: z.string().trim().max(32).optional().describe("Telefone do destinatário (formato internacional)."),
  contact_id: z.string().uuid().optional().describe("ID do contacto CRM (alternativa a phone)."),
  lead_id: z.string().uuid().optional().describe("ID da lead (alternativa a phone)."),
  purpose: z
    .enum(["transactional", "marketing"])
    .optional()
    .describe("Finalidade do envio. 'marketing' exige consentimento explícito. Predefinição: marketing."),
  idempotency_key: z.string().trim().max(120).optional().describe("Chave de idempotência opcional."),
};

/** Converte erros de política em respostas MCP sem expor segredos nem detalhes internos. */
export function toolError(e: unknown) {
  if (e instanceof McpWhatsAppError) return errorResult(`${e.code}: ${e.message}`);
  const message = e instanceof Error ? e.message : "internal_error";
  return errorResult(message.replace(/(instance|client)[_-]?token[^\s]*/gi, "[redacted]"));
}
