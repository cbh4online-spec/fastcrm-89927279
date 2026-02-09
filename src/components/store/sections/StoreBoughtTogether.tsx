import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Package, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface StoreBoughtTogetherProps {
  productId: string;
  categoryId: string | null;
  workspaceId: string;
  currentPrice: number;
  currency: string;
}

export function StoreBoughtTogether({ productId, categoryId, workspaceId, currentPrice, currency }: StoreBoughtTogetherProps) {
  const { addItem } = useStoreCart();

  const { data: related } = useQuery({
    queryKey: ["store-bought-together", productId, categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku")
        .eq("workspace_id", workspaceId)
        .eq("store_category_id", categoryId)
        .eq("store_published", true)
        .eq("status", "active")
        .neq("id", productId)
        .neq("stock_status", "out_of_stock")
        .order("store_sort_order", { ascending: true })
        .limit(3);
      return data || [];
    },
    enabled: !!categoryId,
    staleTime: 60_000,
  });

  if (!related?.length) return null;

  const totalPrice = currentPrice + related.reduce((s, p) => s + p.base_price, 0);

  const handleAddAll = () => {
    for (const p of related) {
      const imgIdx = p.primary_image_index ?? 0;
      addItem({
        productId: p.id,
        name: p.name,
        price: p.base_price,
        currency: p.currency,
        image: p.images?.[imgIdx] || p.images?.[0],
        sku: p.sku || undefined,
      });
    }
    toast.success(`${related.length} produtos adicionados ao carrinho`);
  };

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-6">Frequentemente comprados juntos</h2>
      <div className="flex flex-wrap items-center gap-3">
        {related.map((p, i) => {
          const imgIdx = p.primary_image_index ?? 0;
          const img = p.images?.[imgIdx] || p.images?.[0];
          return (
            <div key={p.id} className="flex items-center gap-3">
              {i > 0 && <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
              <div className="w-24 space-y-1 text-center">
                <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted border mx-auto">
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-xs line-clamp-2 font-medium">{p.name}</p>
                <p className="text-xs font-semibold text-primary">€{p.base_price.toFixed(2)}</p>
              </div>
            </div>
          );
        })}

        <div className="ml-4 border-l pl-4 space-y-2">
          <p className="text-sm text-muted-foreground">Total do bundle</p>
          <p className="text-xl font-bold text-primary">€{totalPrice.toFixed(2)}</p>
          <Button size="sm" className="gap-2" onClick={handleAddAll}>
            <ShoppingBag className="h-4 w-4" />
            Adicionar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
