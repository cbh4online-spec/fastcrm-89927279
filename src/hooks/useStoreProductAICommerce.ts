/**
 * Leitura pública do conteúdo AI Commerce de um produto para a loja.
 * Só devolve dados de produtos com AI Commerce ativo e publicados na loja
 * (garantido pela política de leitura pública da base de dados).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreAICommerceContent } from "@/lib/store/productContent";

export interface StoreProductAICommerce extends StoreAICommerceContent {
  ai_title?: string | null;
  ai_keywords?: string[] | null;
}

export function useStoreProductAICommerce(productId?: string) {
  return useQuery({
    queryKey: ["store-product-ai-commerce", productId],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StoreProductAICommerce | null> => {
      const { data, error } = await supabase
        .from("product_ai_commerce")
        .select(
          "ai_title, ai_short_description, ai_long_description, ai_key_features, ai_target_audience, ai_problem_solved, ai_use_cases, ai_keywords, ai_faq",
        )
        .eq("product_id", productId!)
        .eq("ai_commerce_enabled", true)
        .maybeSingle();

      if (error) return null;
      return (data as StoreProductAICommerce | null) ?? null;
    },
  });
}
