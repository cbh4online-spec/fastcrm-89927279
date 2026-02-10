import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductSuggestion {
  categories: string[];
  priceRange: { min: number; max: number };
  suggestedPrice: number;
  description: string;
  productType?: string;
  matchedCategoryName?: string;
}

interface ProductSpecifications {
  brand?: string;
  resolution?: string;
  sensor?: string;
  lens?: string;
  nightVision?: string;
  audio?: string;
  connectivity?: string;
  storage?: string;
  protection?: string;
  wdr?: string;
  compression?: string;
  temperature?: string;
  compatibility?: string;
  power?: string;
  [key: string]: string | undefined;
}

interface SKUSearchResult {
  found: boolean;
  // Technical version
  technicalName?: string;
  technicalDescription?: string;
  // Commercial version (Amazon-style)
  commercialName?: string;
  commercialDescription?: string;
  // Legacy fields for backward compatibility
  name?: string;
  description?: string;
  // Price info
  priceRange?: { min: number; max: number };
  suggestedPrice?: number;
  // Other info
  category?: string;
  imageUrl?: string;
  images?: string[];
  source?: string;
  sources?: string[];
  specifications?: ProductSpecifications;
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
      existingCategories,
    }: {
      productName: string;
      category?: string;
      productType?: string;
      existingCategories?: string[];
    }): Promise<ProductSuggestion> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest",
          productName,
          category,
          productType,
          existingCategories,
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

  const generateProductImage = useMutation({
    mutationFn: async ({
      productName,
      category,
      description,
    }: {
      productName: string;
      category?: string;
      description?: string;
    }): Promise<{ imageBase64: string }> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "generate-product-image",
          productName,
          category,
          description,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to generate image");
      return data.data;
    },
  });

  const suggestRelations = useMutation({
    mutationFn: async ({
      productId,
      workspaceId,
    }: {
      productId: string;
      workspaceId: string;
    }): Promise<{ added: number; relations: Array<{ targetId: string; targetName: string; type: string; reason: string; label: string }> }> => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest-relations",
          productId,
          workspaceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to suggest relations");
      return data.data;
    },
  });

  return {
    suggestFromName,
    searchBySKU,
    generateDescription,
    analyzePrice,
    generateProductImage,
    suggestRelations,
    isLoading:
      suggestFromName.isPending ||
      searchBySKU.isPending ||
      generateDescription.isPending ||
      analyzePrice.isPending ||
      generateProductImage.isPending ||
      suggestRelations.isPending,
  };
}
