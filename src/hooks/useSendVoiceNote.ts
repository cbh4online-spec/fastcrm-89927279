import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { VoiceRecording } from "./useVoiceRecorder";

interface SendVoiceNotePayload {
  conversationId: string;
  channel: string;
  recording: VoiceRecording;
  phone?: string;
}

function extFromMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export function useSendVoiceNote() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ conversationId, channel, recording, phone }: SendVoiceNotePayload) => {
      if (!currentWorkspace) throw new Error("Workspace não selecionado");

      // 1. Upload to storage (path = workspaceId/conversationId/<ts>.ext)
      const ext = extFromMime(recording.mimeType);
      const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const path = `${currentWorkspace.id}/${conversationId}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from("inbox-voice-notes")
        .upload(path, recording.blob, {
          contentType: recording.mimeType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

      const { data: pub } = supabase.storage.from("inbox-voice-notes").getPublicUrl(path);
      const audioUrl = pub.publicUrl;

      // 2. Send via canonical whatsapp-pro-send (suporta ptt desde Fase C)
      if (channel === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("whatsapp-pro-send", {
          body: {
            workspaceId: currentWorkspace.id,
            conversationId,
            phone: phone ?? "",
            messageType: "audio",
            mediaUrl: audioUrl,
            mediaMimeType: recording.mimeType,
            ptt: true,
          },
        });
        if (error) throw new Error(error.message || "Falha ao enviar nota de voz");
        if (data?.error) throw new Error(data.error);
        return { conversationId, audioUrl, durationMs: recording.durationMs };
      }

      // Fallback: persist as outbound message with attachment (other channels not yet supported)
      throw new Error(
        `Notas de voz ainda não estão disponíveis para o canal "${channel}"`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
      toast.success("Nota de voz enviada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
