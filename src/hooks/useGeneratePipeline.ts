import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeneratedStage {
  name: string;
  probability: number;
  color: string;
  description: string;
  daysTarget?: number;
}

export interface GeneratedAutomation {
  name: string;
  trigger: string;
  action: string;
  description: string;
}

export interface GeneratedField {
  name: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  description: string;
}

export interface GeneratedPipeline {
  name: string;
  description: string;
  type: "sales" | "value_ladder" | "funnel";
  industry: string;
  stages: GeneratedStage[];
  suggestedAutomations: GeneratedAutomation[];
  suggestedFields: GeneratedField[];
  explanation: string;
}

interface GeneratePipelineInput {
  description: string;
  currentIndustry?: string;
  existingStages?: string[];
}

export function useGeneratePipeline() {
  return useMutation({
    mutationFn: async (input: GeneratePipelineInput): Promise<GeneratedPipeline> => {
      const { data, error } = await supabase.functions.invoke("generate-pipeline", {
        body: input,
      });

      if (error) {
        throw new Error(error.message || "Erro ao gerar pipeline");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.pipeline) {
        throw new Error("Resposta inválida do servidor");
      }

      return data.pipeline;
    },
    onError: (error: Error) => {
      if (error.message.includes("429") || error.message.includes("Limite")) {
        toast.error("Limite de pedidos excedido", {
          description: "Aguarde alguns segundos e tente novamente.",
        });
      } else if (error.message.includes("402") || error.message.includes("Créditos")) {
        toast.error("Créditos esgotados", {
          description: "Adicione créditos para continuar a usar a IA.",
        });
      } else {
        toast.error("Erro ao gerar pipeline", {
          description: error.message,
        });
      }
    },
  });
}
