import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface GenerateTemplateInput {
  type: "email" | "whatsapp" | "proposal";
  goal: string;
  tone: "formal" | "friendly" | "direct" | "casual";
  context: {
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    conversationContext?: string;
  };
  customInstructions?: string;
  workspaceId?: string;
}

export interface GeneratedEmailTemplate {
  subject: string;
  content: string;
  suggestedName: string;
}

export interface GeneratedWhatsAppTemplate {
  content: string;
  suggestedName: string;
}

export interface GeneratedProposalTemplate {
  content_blocks: Array<{
    type: string;
    title?: string;
    body?: string;
    features?: string[];
    text?: string;
  }>;
  suggestedName: string;
}

export type GeneratedTemplate = GeneratedEmailTemplate | GeneratedWhatsAppTemplate | GeneratedProposalTemplate;

export function useGenerateTemplate() {
  return useMutation({
    mutationFn: async (input: GenerateTemplateInput): Promise<GeneratedTemplate> => {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: input,
      });

      if (error) {
        console.error("Generate template error:", error);
        throw new Error(error.message || "Erro ao gerar template");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao gerar template");
      }

      return data.data;
    },
    onSuccess: (data, variables) => {
      toast.success("Template gerado com sucesso");
      console.log('[COMM-TEMPLATE] AI_GENERATED', { type: variables.type, tone: variables.tone });
      if (variables.workspaceId) {
        emitKernelEvent({
          workspace_id: variables.workspaceId,
          type: 'TEMPLATE.CREATED',
          entity_kind: 'communication_template',
          entity_id: 'ai_generated',
          source_module: 'comm-templates',
          payload: { source: 'ai_generation', type: variables.type, tone: variables.tone },
        });
      }
    },
    onError: (error) => {
      console.warn('[COMM-TEMPLATE] AI_GENERATION_FAILED', { error: error.message });
      toast.error(error.message || "Não foi possível gerar o template");
    },
  });
}
