import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CartRecommendationProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
  compare_at_price: number | null;
  promo_label: string | null;
  category: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  vat_rate?: number;
}

interface Params {
  workspaceId: string | undefined;
  cartProductIds: string[];
  cartCategories: string[];
  enabled?: boolean;
}

const SELECT =
  "id, name, sku, base_price, compare_at_price, promo_label, category, images, primary_image_index";

/**
 * Carrega 3 listas paralelas para o carrinho B2B:
 * - bestSellers  → produtos com maior volume nas últimas encomendas (ranking workspace)
 * - related      → produtos da mesma categoria dos itens em carrinho
 * - promotions   → produtos com compare_at_price > base_price ou promo_label preenchido
 *
 * Todos excluem produtos já no carrinho. RLS garante que só vê os do workspace correcto.
 */
export function useCartRecommendations({
  workspaceId,
  cartProductIds,
  cartCategories,
  enabled = true,
}: Params) {
  const idsKey = [...cartProductIds].sort().join(",");
  const catsKey = [...cartCategories].sort().join(",");

  return useQuery({
    queryKey: ["cart-recommendations", workspaceId, idsKey, catsKey],
    enabled: enabled && !!workspaceId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const empty = {
        bestSellers: [] as CartRecommendationProduct[],
        related: [] as CartRecommendationProduct[],
        promotions: [] as CartRecommendationProduct[],
      };
      if (!workspaceId) return empty;

      const excludeIds = cartProductIds.length > 0 ? cartProductIds : ["00000000-0000-0000-0000-000000000000"];

      // 1. Best sellers: aggregate from order_note_items últimos 90d
      const since = new Date();
      since.setDate(since.getDate() - 90);

      const { data: orderRows } = await supabase
        .from("order_notes")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since.toISOString())
        .limit(500);

      const orderIds = (orderRows || []).map((o: any) => o.id);
      const sellerCounts = new Map<string, number>();

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_note_items")
          .select("product_id, quantity")
          .in("order_note_id", orderIds);

        for (const it of (items || []) as any[]) {
          if (!it.product_id || cartProductIds.includes(it.product_id)) continue;
          sellerCounts.set(
            it.product_id,
            (sellerCounts.get(it.product_id) || 0) + (Number(it.quantity) || 0),
          );
        }
      }

      const topSellerIds = [...sellerCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => id);

      // Parallel: best sellers, related, promotions
      const [bestSellersQ, relatedQ, promosQ] = await Promise.all([
        topSellerIds.length > 0
          ? supabase
              .from("products")
              .select(SELECT)
              .eq("workspace_id", workspaceId)
              .eq("status", "active")
              .eq("b2b_published", true)
              .in("id", topSellerIds)
          : Promise.resolve({ data: [] as any[] } as any),

        cartCategories.length > 0
          ? supabase
              .from("products")
              .select(SELECT)
              .eq("workspace_id", workspaceId)
              .eq("status", "active")
              .eq("b2b_published", true)
              .in("category", cartCategories)
              .not("id", "in", `(${excludeIds.join(",")})`)
              .limit(8)
          : Promise.resolve({ data: [] as any[] } as any),

        supabase
          .from("products")
          .select(SELECT)
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .eq("b2b_published", true)
          .or("compare_at_price.gt.0,promo_label.not.is.null")
          .not("id", "in", `(${excludeIds.join(",")})`)
          .limit(12),
      ]);

      const normalize = (rows: any[]): CartRecommendationProduct[] =>
        (rows || []).map((p) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : null,
        }));

      // Reorder best sellers by volume
      const sellersById = new Map<string, CartRecommendationProduct>();
      normalize(bestSellersQ.data || []).forEach((p) => sellersById.set(p.id, p));
      const bestSellers = topSellerIds
        .map((id) => sellersById.get(id))
        .filter(Boolean) as CartRecommendationProduct[];

      // Promotions: keep only those with real discount or promo_label
      const promotions = normalize(promosQ.data || [])
        .filter((p) => {
          const hasPriceCut =
            p.compare_at_price != null && Number(p.compare_at_price) > Number(p.base_price);
          const hasLabel = !!(p.promo_label && p.promo_label.trim());
          return hasPriceCut || hasLabel;
        })
        .slice(0, 6);

      const related = normalize(relatedQ.data || []).slice(0, 6);

      return { bestSellers, related, promotions };
    },
  });
}
