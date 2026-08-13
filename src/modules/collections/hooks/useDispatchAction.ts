import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DispatchActionInput {
  caseId: string;
  channel: "email" | "whatsapp";
  subject?: string;
  body: string;
}

export interface DispatchResult {
  ok: boolean;
  action_id?: string;
  delivery?: { status: "sent" | "failed" | "manual"; reason?: string; error?: string };
  error?: string;
}

const MANUAL_REASONS: Record<string, string> = {
  no_email: "O devedor não tem email registado — a mensagem ficou registada como manual.",
  no_phone: "O devedor não tem telemóvel registado — a mensagem ficou registada como manual.",
  email_provider_not_configured: "Envio de email não configurado — mensagem registada como manual.",
  whatsapp_not_configured: "WhatsApp não ligado nesta workspace — mensagem registada como manual.",
};

/** Envia efectivamente a comunicação de cobrança através da edge function. */
export function useDispatchAction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: DispatchActionInput): Promise<DispatchResult> => {
      const { data, error } = await supabase.functions.invoke("collections-dispatch-action", {
        body: {
          caseId: input.caseId,
          channel: input.channel,
          subject: input.subject,
          body: input.body,
        },
      });
      if (error) throw error;
      const result = data as DispatchResult;
      if (!result?.ok) throw new Error(result?.error ?? "Falha no envio");
      return result;
    },
    onSuccess: (result, input) => {
      qc.invalidateQueries({ queryKey: ["case-actions", input.caseId] });
      qc.invalidateQueries({ queryKey: ["collection-case", input.caseId] });
      qc.invalidateQueries({ queryKey: ["collection-cases"] });

      const status = result.delivery?.status;
      if (status === "sent") {
        toast.success(input.channel === "email" ? "Email enviado" : "WhatsApp enviado");
      } else if (status === "manual") {
        toast.warning(
          MANUAL_REASONS[result.delivery?.reason ?? ""] ?? "Registado como contacto manual.",
        );
      } else {
        toast.error("Falha no envio: " + (result.delivery?.error ?? "erro desconhecido"));
      }
    },
    onError: (err: Error) => {
      toast.error("Erro ao enviar: " + err.message);
    },
  });
}
