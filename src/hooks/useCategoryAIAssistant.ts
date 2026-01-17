import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategorySuggestion {
  name: string;
  description: string;
  color: string;
  imageBase64?: string;
}

export interface CategoryDetailsResult {
  description: string;
  color: string;
}

export function useCategoryAIAssistant() {
  const generateCategory = useMutation({
    mutationFn: async ({
      theme,
      existingCategories,
    }: {
      theme: string;
      existingCategories?: string[];
    }): Promise<CategorySuggestion> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "generate-category",
          theme,
          existingCategories,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar categoria");
      return data.data;
    },
  });

  const generateCategoryImage = useMutation({
    mutationFn: async ({
      categoryName,
      description,
    }: {
      categoryName: string;
      description?: string;
    }): Promise<{ imageBase64: string }> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "generate-category-image",
          categoryName,
          description,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao gerar imagem");
      return data.data;
    },
  });

  const suggestCategoryDetails = useMutation({
    mutationFn: async ({
      name,
    }: {
      name: string;
    }): Promise<CategoryDetailsResult> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest-category-details",
          categoryName: name,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao sugerir detalhes");
      return data.data;
    },
  });

  return {
    generateCategory,
    generateCategoryImage,
    suggestCategoryDetails,
    isLoading:
      generateCategory.isPending ||
      generateCategoryImage.isPending ||
      suggestCategoryDetails.isPending,
  };
}
