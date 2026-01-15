import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConversationContext {
  messages: Array<{
    direction: string;
    content: string;
    sent_at: string;
  }>;
  leadName?: string;
  leadEmail?: string;
  channel?: string;
  aiIntent?: string;
  aiSentiment?: string;
}

interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: string;
  trigger_config?: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  explanation: string;
  natural_language_summary: string;
}

interface GenerateAutomationInput {
  conversation?: ConversationContext;
  userRequest?: string;
}

export function useGenerateAutomation() {
  return useMutation({
    mutationFn: async (input: GenerateAutomationInput): Promise<GeneratedAutomation> => {
      const { data, error } = await supabase.functions.invoke("ai-generate-automation", {
        body: input,
      });

      if (error) throw error;
      if (!data?.automation) throw new Error("No automation generated");

      return data.automation;
    },
    onError: (error) => {
      console.error("Error generating automation:", error);
      toast.error("Erro ao gerar automação. Tente novamente.");
    },
  });
}

// Natural language examples for the UI
export const automationExamples = [
  {
    text: "Se contacto não responder em 2 dias → enviar follow-up",
    request: "Criar automação para enviar follow-up se o contacto não responder em 2 dias",
  },
  {
    text: "Se pedir preço → criar oportunidade",
    request: "Quando alguém perguntar sobre preço, criar uma oportunidade automaticamente",
  },
  {
    text: "Se proposta visualizada → criar tarefa de follow-up",
    request: "Quando uma proposta for visualizada, criar uma tarefa para fazer follow-up",
  },
  {
    text: "Se mensagem recebida no WhatsApp → notificar equipa",
    request: "Notificar a equipa quando receber uma mensagem no WhatsApp",
  },
  {
    text: "Se tag 'quente' adicionada → criar oportunidade",
    request: "Quando a tag 'quente' for adicionada a um lead, criar uma oportunidade",
  },
];