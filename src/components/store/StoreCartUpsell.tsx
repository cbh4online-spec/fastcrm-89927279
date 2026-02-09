import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

interface StoreCartUpsellProps {
  workspaceSlug: string;
}

export function StoreCartUpsell({ workspaceSlug }: StoreCartUpsellProps) {
  const { items, addItem } = useStoreCart();
  const cartProductIds = items.map((i) => i.productId);

  const { data: suggestions } = useQuery({
    queryKey: ["store-cart-upsell", workspaceSlug, cartProductIds],
    queryFn: async () => {
      // Get workspace id from slug
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();
      if (!ws) return [];

      let query = supabase
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku, store_featured")
        .eq("workspace_id", ws.id)
        .eq("store_published", true)
        .eq("status", "active")
        .neq("stock_status", "out_of_stock")
        .order("store_featured", { ascending: false })
        .order("store_sort_order", { ascending: true })
        .limit(6);

      const { data } = await query;
      // Filter out items already in cart
      return (data || []).filter((p) => !cartProductIds.includes(p.id)).slice(0, 2);
    },
    enabled: items.length > 0,
    staleTime: 60_000,
  });

  if (!suggestions?.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Pode também gostar</p>
      <div className="space-y-2">
        {suggestions.map((p) => {
          const imgIdx = p.primary_image_index ?? 0;
          const img = p.images?.[imgIdx] || p.images?.[0];
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2">
              <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {img ? (
                  <img src={img} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-1">{p.name}</p>
                <p className="text-xs font-semibold text-primary">€{p.base_price.toFixed(2)}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() =>
                  addItem({
                    productId: p.id,
                    name: p.name,
                    price: p.base_price,
                    currency: p.currency,
                    image: img,
                    sku: p.sku || undefined,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
