import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface StoreRelatedProductsProps {
  productId: string;
  categoryId: string | null;
  workspaceId: string;
  workspaceSlug: string;
}

export function StoreRelatedProducts({ productId, categoryId, workspaceId, workspaceSlug }: StoreRelatedProductsProps) {
  const { data: products } = useQuery({
    queryKey: ["store-related", productId, categoryId],
    queryFn: async () => {
      // First try: get "related" relations from product_relations
      const { data: relations } = await supabase
        .from("product_relations" as any)
        .select("target_product_id")
        .eq("source_product_id", productId)
        .eq("relation_type", "related")
        .eq("is_active", true)
        .order("sort_order")
        .limit(8);

      if (relations && relations.length > 0) {
        const targetIds = relations.map((r: any) => r.target_product_id);
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, base_price, images, primary_image_index, category")
          .in("id", targetIds)
          .eq("store_published", true)
          .eq("status", "active");

        if (prods && prods.length > 0) {
          // Maintain sort order from relations
          return targetIds
            .map((tid: string) => prods.find((p) => p.id === tid))
            .filter(Boolean) as typeof prods;
        }
      }

      // Fallback: same category
      if (!categoryId) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, images, primary_image_index, category")
        .eq("workspace_id", workspaceId)
        .eq("store_category_id", categoryId)
        .eq("store_published", true)
        .eq("status", "active")
        .neq("id", productId)
        .order("store_sort_order", { ascending: true })
        .limit(8);
      return data || [];
    },
    staleTime: 60_000,
  });

  if (!products?.length) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-6">Clientes também viram</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {products.map((p) => {
            const imgIdx = p.primary_image_index ?? 0;
            const img = p.images?.[imgIdx] || p.images?.[0];
            return (
              <Link
                key={p.id}
                to={`/store/${workspaceSlug}/product/${p.id}`}
                className="flex-shrink-0 w-40 group"
              >
                <div className="h-40 w-40 rounded-lg overflow-hidden bg-muted border transition-shadow group-hover:shadow-md">
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{p.name}</p>
                  <p className="text-sm font-bold text-primary">€{p.base_price.toFixed(2)}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
