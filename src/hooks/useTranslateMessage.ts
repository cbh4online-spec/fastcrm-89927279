import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TranslateInput {
  text: string;
  target_language?: string;
  source_language?: string;
}

export interface TranslateResult {
  translated_text: string;
  target_language: string;
  source_language: string;
}

export function useTranslateMessage() {
  return useMutation({
    mutationFn: async (input: TranslateInput): Promise<TranslateResult> => {
      const { data, error } = await supabase.functions.invoke("whatsapp-translate-message", {
        body: input,
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === "rate_limited") throw new Error("Limite de pedidos AI atingido. Tente novamente.");
        if (data.error === "payment_required") throw new Error("Créditos AI esgotados.");
        if (data.error === "ai_not_configured") throw new Error("Tradução AI não configurada.");
        throw new Error(data.error);
      }
      return {
        translated_text: data.translated_text,
        target_language: data.target_language,
        source_language: data.source_language,
      };
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha na tradução"),
  });
}
