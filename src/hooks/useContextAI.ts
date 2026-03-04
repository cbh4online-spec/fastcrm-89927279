import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AISuggestion {
  field_key: string;
  suggested_value: any;
  confidence: number;
  reasoning: string;
}

export interface ContextAction {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  source_block: string;
  category: 'gap' | 'goal' | 'process' | 'opportunity';
}

export function useAISuggestFields() {
  return useMutation({
    mutationFn: async ({
      blockId,
      workspaceId,
      blockType,
      fields,
    }: {
      blockId: string;
      workspaceId: string;
      blockType: string;
      fields: any[];
    }): Promise<AISuggestion[]> => {
      const { data, error } = await supabase.functions.invoke("context-ai-assist", {
        body: {
          action: "suggest_fields",
          blockId,
          workspaceId,
          blockType,
          fields,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        throw new Error(data.error);
      }
      return data.suggestions || [];
    },
    onError: (err: Error) => toast.error("Erro IA: " + err.message),
  });
}

export function useAIGenerateActions() {
  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }): Promise<ContextAction[]> => {
      const { data, error } = await supabase.functions.invoke("context-ai-assist", {
        body: { action: "generate_actions", workspaceId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        throw new Error(data.error);
      }
      return data.actions || [];
    },
    onError: (err: Error) => toast.error("Erro IA: " + err.message),
  });
}
