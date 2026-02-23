import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface AIImproveGoals {
  tone?: string;
  language?: string;
  seo?: boolean;
  max_length?: {
    short_description?: number;
    seo_snippet?: number;
  };
}

interface AIImproveGenerate {
  short_description?: boolean;
  long_description?: boolean;
  bullets?: boolean;
  tags?: boolean;
  seo_snippet?: boolean;
}

interface AIImproveInputsOverride {
  key_features?: string[];
  materials?: string | null;
  dimensions?: string | null;
  target_audience?: string | null;
}

interface AIImproveOptions {
  write_back?: boolean;
  create_embeddings?: boolean;
  channel?: string;
}

interface AIImproveRequest {
  productId: string;
  goals?: AIImproveGoals;
  generate?: AIImproveGenerate;
  inputsOverride?: AIImproveInputsOverride;
  options?: AIImproveOptions;
}

interface AIImproveGenerated {
  short_description?: string;
  long_description?: string;
  bullets?: string[];
  tags?: string[];
  seo_snippet?: string;
}

interface AIImproveResult {
  product_id: string;
  generated: AIImproveGenerated;
  updated_fields: string[];
  embeddings: { requested: boolean; status: string };
  audit: { log_id: string | null; event: string };
}

export function useProductAIImprove() {
  const { currentWorkspace } = useWorkspace();

  const improve = useMutation({
    mutationFn: async (request: AIImproveRequest): Promise<AIImproveResult> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { data, error } = await supabase.functions.invoke("product-ai-improve", {
        body: {
          product_id: request.productId,
          goals: request.goals || {},
          generate: request.generate || { short_description: true, long_description: true, tags: true },
          inputs_override: request.inputsOverride || {},
          options: request.options || { write_back: true, create_embeddings: false },
        },
        headers: {
          "X-Workspace-Id": currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error?.message || "Failed to improve product");
      return data.data;
    },
  });

  return {
    improve,
    isPending: improve.isPending,
    isError: improve.isError,
    error: improve.error,
  };
}

export type { AIImproveRequest, AIImproveResult, AIImproveGenerated };
