import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductImageCandidate {
  url: string;
  source_url: string;
  source_title?: string;
}

interface ProductImageSearchResult {
  success: boolean;
  candidates: ProductImageCandidate[];
  fallback?: boolean;
  error?: string;
  warning?: string;
}

/**
 * Pesquisa imagens reais de um produto via edge function `product-image-search`.
 *
 * - Lazy: só corre quando `enabled = true` (i.e. o utilizador abriu o popover).
 * - Cache em memória por nome (10 min) para não consumir Firecrawl repetidamente.
 * - Devolve sempre um array (vazio se vazio/erro) — a UI lida via `error`/`warning`.
 */
export function useProductImageSearch(productName: string, enabled: boolean) {
  return useQuery<ProductImageSearchResult>({
    queryKey: ["product-image-search", productName.trim().toLowerCase()],
    enabled: enabled && productName.trim().length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ProductImageSearchResult>(
        "product-image-search",
        { body: { query: productName.trim(), limit: 4 } },
      );
      if (error) {
        return { success: false, candidates: [], error: error.message };
      }
      return data ?? { success: false, candidates: [], error: "Sem resposta do serviço" };
    },
  });
}
