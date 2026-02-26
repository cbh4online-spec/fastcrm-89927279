import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FormattingConfig } from "@/types/fieldManager";

interface AIAutofillParams {
  field_config: Pick<FormattingConfig, "ai_autofill_type" | "ai_autofill_guidance">;
  record_data: Record<string, unknown>;
  field_name: string;
}

export function useAIAutofillField() {
  return useMutation({
    mutationFn: async (params: AIAutofillParams) => {
      const { data, error } = await supabase.functions.invoke("ai-autofill-field", {
        body: params,
      });

      if (error) {
        throw new Error(error.message || "AI autofill failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data.value as string;
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit")) {
        toast.error("Limite de pedidos excedido. Tente novamente mais tarde.");
      } else if (error.message.includes("Payment required")) {
        toast.error("Créditos insuficientes para AI autofill.");
      } else {
        toast.error("Erro no AI autofill: " + error.message);
      }
    },
  });
}
