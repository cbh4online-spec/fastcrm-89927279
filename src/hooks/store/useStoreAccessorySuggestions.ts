/**
 * Sugestões de acessórios para a ficha pública de produto.
 * Lê apenas o catálogo publicado do workspace e o conteúdo AI Commerce ativo.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  suggestAccessories,
  type AccessoryCandidate,
  type AccessorySuggestion,
} from "@/lib/store/accessoryRecommendations";

interface Params {
  productId?: string;
  workspaceId?: string;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | null;
  enabled?: boolean;
}

export function useStoreAccessorySuggestions({
  productId,
  workspaceId,
  name,
  category,
  subcategory,
  price,
  enabled = true,
}: Params) {
  return useQuery({
    queryKey: ["store-accessory-suggestions", workspaceId, productId],
    enabled: enabled && !!productId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AccessorySuggestion[]> => {
      const { data: products, error } = await supabase
        .from("products")
        .select(
          "id, name, store_slug, sku, base_price, currency, images, primary_image_index, category, subcategory, stock_status, short_description",
        )
        .eq("workspace_id", workspaceId!)
        .eq("store_published", true)
        .eq("status", "active")
        .limit(300);

      if (error || !products?.length) return [];

      const { data: aiRows } = await supabase
        .from("product_ai_commerce")
        .select("product_id, ai_keywords, ai_use_cases, ai_key_features, ai_recommendation_context")
        .eq("ai_commerce_enabled", true)
        .in("product_id", products.map((p) => p.id));

      const contextById = new Map<string, string>();
      for (const row of aiRows || []) {
        contextById.set(
          row.product_id,
          [
            (row.ai_keywords || []).join(" "),
            (row.ai_use_cases || []).join(" "),
            (row.ai_key_features || []).join(" "),
            row.ai_recommendation_context || "",
          ].join(" "),
        );
      }

      const candidates: AccessoryCandidate[] = products.map((p) => {
        const imgIdx = p.primary_image_index ?? 0;
        return {
          id: p.id,
          name: p.name,
          slug: p.store_slug,
          sku: p.sku,
          price: p.base_price,
          currency: p.currency,
          image: p.images?.[imgIdx] || p.images?.[0] || null,
          category: p.category,
          subcategory: (p as { subcategory?: string | null }).subcategory ?? null,
          stockStatus: p.stock_status,
          context: [p.short_description || "", contextById.get(p.id) || ""].join(" "),
        };
      });

      return suggestAccessories(
        {
          id: productId!,
          name: name ?? null,
          category: category ?? null,
          subcategory: subcategory ?? null,
          price: price ?? null,
          context: contextById.get(productId!) || "",
        },
        candidates,
      );
    },
  });
}
