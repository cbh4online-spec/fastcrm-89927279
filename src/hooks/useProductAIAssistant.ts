import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductSuggestion {
  categories: string[];
  priceRange: { min: number; max: number };
  suggestedPrice: number;
  description: string;
  productType?: string;
}

interface SKUSearchResult {
  found: boolean;
  name?: string;
  description?: string;
  priceRange?: { min: number; max: number };
  suggestedPrice?: number;
  category?: string;
  imageUrl?: string;
  source?: string;
}

interface DescriptionResult {
  shortDescription: string;
  fullDescription: string;
}

interface PriceAnalysisResult {
  priceRange: { min: number; max: number };
  suggestedPrice: number;
  pricingStrategy: "economy" | "standard" | "premium";
  rationale: string;
}

export function useProductAIAssistant() {
  const suggestFromName = useMutation({
    mutationFn: async ({
      productName,
      category,
      productType,
    }: {
      productName: string;
      category?: string;
      productType?: string;
    }): Promise<ProductSuggestion> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest",
          productName,
          category,
          productType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to get suggestions");
      return data.data;
    },
  });

  const searchBySKU = useMutation({
    mutationFn: async (sku: string): Promise<SKUSearchResult> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "sku-search",
          sku,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to search SKU");
      return data.data;
    },
  });

  const generateDescription = useMutation({
    mutationFn: async ({
      productName,
      category,
      productType,
    }: {
      productName: string;
      category?: string;
      productType?: string;
    }): Promise<DescriptionResult> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "generate-description",
          productName,
          category,
          productType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to generate description");
      return data.data;
    },
  });

  const analyzePrice = useMutation({
    mutationFn: async ({
      productName,
      category,
      productType,
    }: {
      productName: string;
      category?: string;
      productType?: string;
    }): Promise<PriceAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "price-analysis",
          productName,
          category,
          productType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to analyze price");
      return data.data;
    },
  });

  return {
    suggestFromName,
    searchBySKU,
    generateDescription,
    analyzePrice,
    isLoading:
      suggestFromName.isPending ||
      searchBySKU.isPending ||
      generateDescription.isPending ||
      analyzePrice.isPending,
  };
}
