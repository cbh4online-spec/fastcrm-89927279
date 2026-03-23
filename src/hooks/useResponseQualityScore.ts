import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResponseQualityResult {
  score: number; // 0-100
  factors: {
    tone_alignment: number;
    personalization: number;
    icp_relevance: number;
    clarity: number;
    actionability: number;
  };
  suggestions: string[];
}

/**
 * Scores an AI-generated response (0-100) based on:
 * - Tone of voice alignment with Context OS
 * - Personalization level
 * - ICP relevance
 * - Clarity
 * - Actionability
 */
export function useResponseQualityScore() {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      responseText,
      context,
    }: {
      workspaceId: string;
      responseText: string;
      context?: string;
    }): Promise<ResponseQualityResult> => {
      const { data, error } = await supabase.functions.invoke("response-quality-score", {
        body: { workspaceId, responseText, context },
      });
      if (error) throw error;
      return data as ResponseQualityResult;
    },
  });
}
