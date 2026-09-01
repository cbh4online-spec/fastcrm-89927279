import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult } from "../supabaseClient";
import { createSupabaseWhatsAppGateway } from "../whatsapp/gateway";
import { sendWhatsApp } from "../whatsapp/service";
import { toolError, whatsappTargetSchema } from "../whatsapp/toolShared";

export default defineTool({
  name: "send_whatsapp_text",
  title: "Enviar mensagem WhatsApp",
  description:
    "Envia uma mensagem de texto por WhatsApp (WhatsApp Pro) para um telefone, contacto ou lead do workspace. Marketing exige consentimento explícito; opt-outs bloqueiam sempre o envio.",
  inputSchema: {
    ...whatsappTargetSchema,
    message: z.string().trim().min(1).max(4096).describe("Texto da mensagem."),
    delay_message: z
      .number()
      .int()
      .min(1)
      .max(15)
      .optional()
      .describe("Atraso de digitação em segundos antes da entrega (1-15)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const gateway = createSupabaseWhatsAppGateway(supabase, ctx.getUserId()!);
    try {
      const result = await sendWhatsApp(gateway, "send_whatsapp_text", {
        ...input,
        messageType: "text",
        text: input.message,
        delayMessage: input.delay_message,
      });
      return jsonResult(result);
    } catch (e) {
      return toolError(e);
    }
  },
});
