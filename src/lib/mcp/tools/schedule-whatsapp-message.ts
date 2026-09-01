import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult } from "../supabaseClient";
import { createSupabaseWhatsAppGateway } from "../whatsapp/gateway";
import { scheduleWhatsAppMessage } from "../whatsapp/service";
import { toolError, whatsappTargetSchema } from "../whatsapp/toolShared";

export default defineTool({
  name: "schedule_whatsapp_message",
  title: "Agendar mensagem WhatsApp",
  description:
    "Agenda uma mensagem WhatsApp no scheduler existente do WhatsApp Pro. O envio é revalidado (consentimento e opt-out) no momento do disparo.",
  inputSchema: {
    ...whatsappTargetSchema,
    message: z.string().trim().min(1).max(4096).describe("Texto da mensagem a agendar."),
    scheduled_at: z
      .string()
      .trim()
      .max(40)
      .describe("Data/hora ISO 8601 (UTC) do envio, no futuro e até 1 ano."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const gateway = createSupabaseWhatsAppGateway(supabaseForUser(ctx), ctx.getUserId()!);
    try {
      return jsonResult(await scheduleWhatsAppMessage(gateway, input));
    } catch (e) {
      return toolError(e);
    }
  },
});
