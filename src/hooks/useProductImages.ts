import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { ProductImage } from "@/types/product";

export function useProductImages(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("position");

      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useAddProductImage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      url: string;
      altText?: string;
      isAiGenerated?: boolean;
      aiPrompt?: string;
    }) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      // Get max position
      const { data: existing } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", input.productId)
        .order("position", { ascending: false })
        .limit(1);

      const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from("product_images")
        .insert({
          workspace_id: currentWorkspace.id,
          product_id: input.productId,
          url: input.url,
          alt_text: input.altText,
          is_ai_generated: input.isAiGenerated || false,
          ai_prompt: input.aiPrompt,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", variables.productId] });
      toast.success("Imagem adicionada!");
    },
    onError: (error) => {
      console.warn('[PRODUCTS] IMAGE_ADD_FAILED', error.message);
      toast.error("Erro ao adicionar imagem: " + error.message);
    },
  });
}

export function useUpdateProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      productId: string;
      altText?: string;
      position?: number;
    }) => {
      const updateData: Record<string, any> = {};

      if (input.altText !== undefined) updateData.alt_text = input.altText;
      if (input.position !== undefined) updateData.position = input.position;

      const { data, error } = await supabase
        .from("product_images")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return { data, productId: input.productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
    },
    onError: (error) => {
      console.warn('[PRODUCTS] IMAGE_UPDATE_FAILED', error.message);
      toast.error("Erro ao atualizar imagem: " + error.message);
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
      toast.success("Imagem removida!");
    },
    onError: (error) => {
      console.warn('[PRODUCTS] IMAGE_DELETE_FAILED', error.message);
      toast.error("Erro ao remover imagem: " + error.message);
    },
  });
}

export function useReorderProductImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      imageIds: string[];
    }) => {
      // Update positions
      const updates = input.imageIds.map((id, index) =>
        supabase
          .from("product_images")
          .update({ position: index })
          .eq("id", id)
      );

      await Promise.all(updates);
      return { productId: input.productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-images", productId] });
    },
    onError: (error) => {
      console.warn('[PRODUCTS] IMAGE_REORDER_FAILED', error.message);
      toast.error("Erro ao reordenar imagens: " + error.message);
    },
  });
}
