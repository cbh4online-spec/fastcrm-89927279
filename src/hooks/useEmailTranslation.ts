import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TranslationLanguage = "pt" | "pt-BR" | "en" | "es" | "fr" | "de" | "it";

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  changes: string[];
}

export interface TranslateParams {
  text: string;
  targetLanguage: TranslationLanguage;
  makeNatural?: boolean;
  preserveVariables?: boolean;
  preserveHtml?: boolean;
}

export const LANGUAGE_OPTIONS: { value: TranslationLanguage; label: string; flag: string }[] = [
  { value: "pt", label: "Português (PT)", flag: "🇵🇹" },
  { value: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
];

export function useTranslateEmail() {
  return useMutation({
    mutationFn: async (params: TranslateParams): Promise<TranslationResult> => {
      const { data, error } = await supabase.functions.invoke("ai-translate-email", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          throw new Error("Limite de traduções atingido. Aguarde alguns segundos.");
        }
        if (data.error.includes("credits")) {
          throw new Error("Créditos de IA esgotados. Por favor, adicione créditos.");
        }
        throw new Error(data.error);
      }

      return data as TranslationResult;
    },
    onError: (error) => {
      console.error("Translation error:", error);
      toast.error(`Erro na tradução: ${error.message}`);
    },
  });
}
