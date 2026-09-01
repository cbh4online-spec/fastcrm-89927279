import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult } from "../supabaseClient";
import { createSupabaseWhatsAppGateway } from "../whatsapp/gateway";
import { getWhatsAppConversation } from "../whatsapp/service";
import { toolError, whatsappTargetSchema } from "../whatsapp/toolShared";

const { purpose: _purpose, idempotency_key: _key, ...targetSchema } = whatsappTargetSchema;

export default defineTool({
  name: "get_whatsapp_conversation",
  title: "Ler conversa WhatsApp",
  description:
    "Devolve o histórico recente de uma conversa WhatsApp do workspace, identificada por telefone, contacto ou lead. Apenas leitura.",
  inputSchema: {
    ...targetSchema,
    limit: z.number().int().min(1).max(100).default(25).describe("Número máximo de mensagens (mais recentes)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const gateway = createSupabaseWhatsAppGateway(supabaseForUser(ctx), ctx.getUserId()!);
    try {
      return jsonResult(await getWhatsAppConversation(gateway, input));
    } catch (e) {
      return toolError(e);
    }
  },
});
