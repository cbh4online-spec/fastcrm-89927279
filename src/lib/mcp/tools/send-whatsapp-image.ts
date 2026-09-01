import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult } from "../supabaseClient";
import { createSupabaseWhatsAppGateway } from "../whatsapp/gateway";
import { sendWhatsApp } from "../whatsapp/service";
import { toolError, whatsappTargetSchema } from "../whatsapp/toolShared";

export default defineTool({
  name: "send_whatsapp_image",
  title: "Enviar imagem WhatsApp",
  description:
    "Envia uma imagem por WhatsApp (WhatsApp Pro) para um telefone, contacto ou lead do workspace. O URL tem de ser HTTPS público. Marketing exige consentimento explícito.",
  inputSchema: {
    ...whatsappTargetSchema,
    image_url: z.string().trim().url().max(2048).describe("URL HTTPS público da imagem (jpg, png, webp, gif)."),
    caption: z.string().trim().max(1024).optional().describe("Legenda da imagem."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const gateway = createSupabaseWhatsAppGateway(supabaseForUser(ctx), ctx.getUserId()!);
    try {
      const result = await sendWhatsApp(gateway, "send_whatsapp_image", {
        ...input,
        messageType: "image",
        text: input.caption,
        mediaUrl: input.image_url,
      });
      return jsonResult(result);
    } catch (e) {
      return toolError(e);
    }
  },
});
