import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Package, Puzzle, ShoppingBag } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface StoreCompatibleProductsProps {
  productId: string;
  workspaceId: string;
  workspaceSlug: string;
}

export function StoreCompatibleProducts({ productId, workspaceId, workspaceSlug }: StoreCompatibleProductsProps) {
  const { addItem } = useStoreCart();

  const { data: products } = useQuery({
    queryKey: ["store-compatible", productId],
    queryFn: async () => {
      // Get compatible relations
      const { data: relations } = await supabase
        .from("product_relations" as any)
        .select("target_product_id, reason")
        .eq("source_product_id", productId)
        .eq("relation_type", "compatible")
        .eq("is_active", true)
        .order("sort_order");

      if (!relations?.length) return [];

      const targetIds = relations.map((r: any) => r.target_product_id);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku, category")
        .in("id", targetIds)
        .eq("store_published", true)
        .eq("status", "active");

      if (!prods) return [];

      // Merge reason and maintain sort order
      return targetIds
        .map((tid: string) => {
          const prod = prods.find((p) => p.id === tid);
          const rel = relations.find((r: any) => r.target_product_id === tid);
          return prod ? { ...prod, reason: (rel as any)?.reason } : null;
        })
        .filter(Boolean) as any[];
    },
    staleTime: 60_000,
  });

  if (!products?.length) return null;

  const handleAdd = (p: any) => {
    const imgIdx = p.primary_image_index ?? 0;
    addItem({
      productId: p.id,
      name: p.name,
      price: p.base_price,
      currency: p.currency,
      image: p.images?.[imgIdx] || p.images?.[0],
      sku: p.sku || undefined,
    });
    toast.success(`${p.name} adicionado ao carrinho`);
  };

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <Puzzle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Produtos Compatíveis</h2>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {products.map((p: any) => {
            const imgIdx = p.primary_image_index ?? 0;
            const img = p.images?.[imgIdx] || p.images?.[0];
            return (
              <div key={p.id} className="flex-shrink-0 w-44 group">
                <div className="h-44 w-44 rounded-lg overflow-hidden bg-muted border transition-shadow group-hover:shadow-md relative">
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.preventDefault(); handleAdd(p); }}
                  >
                    <ShoppingBag className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{p.name}</p>
                  {p.reason && <p className="text-xs text-muted-foreground">{p.reason}</p>}
                  <p className="text-sm font-bold text-primary">€{p.base_price.toFixed(2)} <StoreVatLabel /></p>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
