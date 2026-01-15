import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { ProductProgression, ProgressionAction } from "@/types/product";

export function useProductProgressions(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-progressions", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_progressions")
        .select(`
          *,
          to_product:products!product_progressions_to_product_id_fkey(id, name, base_price, currency)
        `)
        .eq("from_product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("position");

      if (error) throw error;
      return data as ProductProgression[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

// Get all progressions to a product (who can upgrade TO this product)
export function useIncomingProgressions(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["incoming-progressions", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_progressions")
        .select(`
          *,
          from_product:products!product_progressions_from_product_id_fkey(id, name, base_price, currency)
        `)
        .eq("to_product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("position");

      if (error) throw error;
      return data as ProductProgression[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useCreateProductProgression() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      fromProductId: string;
      toProductId: string;
      progressionName?: string;
      timingDays?: number;
      timingWindowStart?: number;
      timingWindowEnd?: number;
      suggestedMessage?: string;
      recommendedAction?: ProgressionAction;
      confidenceScore?: number;
      isAiSuggested?: boolean;
    }) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      // Get max position
      const { data: existing } = await supabase
        .from("product_progressions")
        .select("position")
        .eq("from_product_id", input.fromProductId)
        .order("position", { ascending: false })
        .limit(1);

      const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from("product_progressions")
        .insert({
          workspace_id: currentWorkspace.id,
          from_product_id: input.fromProductId,
          to_product_id: input.toProductId,
          progression_name: input.progressionName,
          timing_days: input.timingDays,
          timing_window_start: input.timingWindowStart,
          timing_window_end: input.timingWindowEnd,
          suggested_message: input.suggestedMessage,
          recommended_action: input.recommendedAction,
          confidence_score: input.confidenceScore || 80,
          is_ai_suggested: input.isAiSuggested || false,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-progressions", variables.fromProductId] });
      queryClient.invalidateQueries({ queryKey: ["incoming-progressions", variables.toProductId] });
      toast.success("Progressão criada!");
    },
    onError: (error) => {
      toast.error("Erro ao criar progressão: " + error.message);
    },
  });
}

export function useUpdateProductProgression() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      fromProductId: string;
      progressionName?: string;
      timingDays?: number | null;
      timingWindowStart?: number | null;
      timingWindowEnd?: number | null;
      suggestedMessage?: string | null;
      recommendedAction?: ProgressionAction | null;
      confidenceScore?: number | null;
      isActive?: boolean;
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.progressionName !== undefined) updateData.progression_name = input.progressionName;
      if (input.timingDays !== undefined) updateData.timing_days = input.timingDays;
      if (input.timingWindowStart !== undefined) updateData.timing_window_start = input.timingWindowStart;
      if (input.timingWindowEnd !== undefined) updateData.timing_window_end = input.timingWindowEnd;
      if (input.suggestedMessage !== undefined) updateData.suggested_message = input.suggestedMessage;
      if (input.recommendedAction !== undefined) updateData.recommended_action = input.recommendedAction;
      if (input.confidenceScore !== undefined) updateData.confidence_score = input.confidenceScore;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from("product_progressions")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return { data, fromProductId: input.fromProductId };
    },
    onSuccess: ({ fromProductId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-progressions", fromProductId] });
      toast.success("Progressão atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar progressão: " + error.message);
    },
  });
}

export function useDeleteProductProgression() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fromProductId }: { id: string; fromProductId: string }) => {
      const { error } = await supabase
        .from("product_progressions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { fromProductId };
    },
    onSuccess: ({ fromProductId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-progressions", fromProductId] });
      toast.success("Progressão removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover progressão: " + error.message);
    },
  });
}
