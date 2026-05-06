import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

export interface WhatsAppAudioInsight {
  id: string;
  workspace_id: string;
  message_id: string;
  conversation_id: string;
  contact_id: string | null;
  media_url: string;
  duration_seconds: number | null;
  language: string;
  transcription_status: TranscriptionStatus;
  transcription_text: string | null;
  transcription_provider: string | null;
  transcription_error: string | null;
  transcription_completed_at: string | null;
  summary: string | null;
  intent: string | null;
  sentiment: string | null;
  urgency: string | null;
  next_action: string | null;
  suggested_reply: string | null;
  suggested_task_title: string | null;
  suggested_task_description: string | null;
  suggested_ticket_title: string | null;
  suggested_ticket_priority: string | null;
  suggested_deal_action: string | null;
  confidence: number | null;
  ai_analysis_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAudioInsight(messageId: string | null | undefined) {
  return useQuery({
    queryKey: ["whatsapp-audio-insight", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const { data, error } = await supabase
        .from("whatsapp_audio_insights" as never)
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as WhatsAppAudioInsight | null;
    },
    enabled: !!messageId,
    refetchInterval: (q) => {
      const data = q.state.data as WhatsAppAudioInsight | null | undefined;
      return data?.transcription_status === "processing" ? 3000 : false;
    },
  });
}

export function useTranscribeAndAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      mediaUrl?: string;
      conversationId?: string;
      language?: string;
      analyze?: boolean;
    }) => {
      const tResp = await supabase.functions.invoke("whatsapp-transcribe-audio", {
        body: {
          message_id: input.messageId,
          media_url: input.mediaUrl,
          conversation_id: input.conversationId,
          language: input.language ?? "pt-PT",
        },
      });
      if (tResp.error) throw new Error(tResp.error.message);
      if (tResp.data?.error) throw new Error(tResp.data.error);

      if (input.analyze !== false) {
        const aResp = await supabase.functions.invoke("whatsapp-analyze-audio-transcript", {
          body: { message_id: input.messageId },
        });
        if (aResp.error) throw new Error(aResp.error.message);
        if (aResp.data?.error) throw new Error(aResp.data.error);
        return { transcription: tResp.data, analysis: aResp.data };
      }
      return { transcription: tResp.data };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-audio-insight", vars.messageId] });
      toast.success("Áudio processado");
    },
    onError: (e: Error) => {
      const msg = e.message || "Falha no processamento";
      if (msg.includes("rate_limited")) toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
      else if (msg.includes("payment_required")) toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
      else if (msg.includes("transcription_provider_not_configured")) toast.error("Provider de transcrição não configurado.");
      else toast.error(msg);
    },
  });
}

export function useAnalyzeAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-analyze-audio-transcript", {
        body: { message_id: input.messageId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-audio-insight", vars.messageId] });
      toast.success("Análise IA concluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
