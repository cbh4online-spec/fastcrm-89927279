import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  buildBundleSuggestions,
  type BundleCandidateProduct,
  type BundleCandidateRelation,
  type BundleSuggestion,
} from "@/lib/ai-commerce/bundleBuilder";

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in (first as any)) {
      return String((first as any).url);
    }
  }
  return null;
}

/**
 * Sugestões de bundles AI Commerce — determinísticas, a partir dos produtos
 * reais e das relações comerciais já aprovadas no catálogo.
 */
export function useBundleSuggestions(options?: { brand?: string | null; enabled?: boolean }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery<BundleSuggestion[]>({
    queryKey: ["bundle-suggestions", currentWorkspace?.id, options?.brand ?? null],
    enabled: !!currentWorkspace?.id && options?.enabled !== false,
    queryFn: async () => {
      const workspaceId = currentWorkspace!.id;

      const [{ data: products, error: productsError }, { data: relations, error: relationsError }] =
        await Promise.all([
          supabase
            .from("products")
            .select(
              "id, name, sku, brand, category, base_price, last_cost, direct_cost, status, store_published, track_stock, stock_quantity, stock_reserved, images"
            )
            .eq("workspace_id", workspaceId)
            .eq("status", "active")
            .limit(2000),
          supabase
            .from("product_relations")
            .select("source_product_id, target_product_id, relation_type, is_active, validation_status")
            .eq("workspace_id", workspaceId)
            .limit(5000),
        ]);

      if (productsError) throw productsError;
      if (relationsError) throw relationsError;

      const candidates: BundleCandidateProduct[] = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        base_price: p.base_price,
        unit_cost: p.last_cost ?? p.direct_cost ?? null,
        status: p.status,
        store_published: p.store_published,
        track_stock: p.track_stock,
        stock_quantity: p.stock_quantity,
        stock_reserved: p.stock_reserved,
        image_url: firstImage(p.images),
      }));

      const rels: BundleCandidateRelation[] = (relations || []) as BundleCandidateRelation[];

      return buildBundleSuggestions(candidates, rels, {
        brand: options?.brand ?? null,
        limit: 6,
      });
    },
  });
}
