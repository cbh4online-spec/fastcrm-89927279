import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult } from "../supabaseClient";
import { createSupabaseWhatsAppGateway } from "../whatsapp/gateway";
import { sendWhatsApp } from "../whatsapp/service";
import { toolError, whatsappTargetSchema } from "../whatsapp/toolShared";

export default defineTool({
  name: "send_whatsapp_video",
  title: "Enviar vídeo WhatsApp",
  description:
    "Envia um vídeo por WhatsApp (WhatsApp Pro) para um telefone, contacto ou lead do workspace. O URL tem de ser HTTPS público. Marketing exige consentimento explícito.",
  inputSchema: {
    ...whatsappTargetSchema,
    video_url: z.string().trim().url().max(2048).describe("URL HTTPS público do vídeo (mp4, mov, webm, 3gp)."),
    caption: z.string().trim().max(1024).optional().describe("Legenda do vídeo."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const gateway = createSupabaseWhatsAppGateway(supabaseForUser(ctx), ctx.getUserId()!);
    try {
      const result = await sendWhatsApp(gateway, "send_whatsapp_video", {
        ...input,
        messageType: "video",
        text: input.caption,
        mediaUrl: input.video_url,
      });
      return jsonResult(result);
    } catch (e) {
      return toolError(e);
    }
  },
});
