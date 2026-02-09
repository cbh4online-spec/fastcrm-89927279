import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Checkbox state — all selected by default
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Initialize selected when related loads
  const selectedItems = related?.filter((p) => {
    // On first render (empty set), treat all as selected
    if (selected.size === 0 && related.length > 0) return true;
    return selected.has(p.id);
  }) || [];

  // If selected set is empty and related is loaded, auto-select all
  if (related && related.length > 0 && selected.size === 0) {
    const allIds = new Set(related.map((p) => p.id));
    // Use setTimeout to avoid setState during render
    setTimeout(() => setSelected(allIds), 0);
  }

  if (!related?.length) return null;

  const bundlePrice = currentPrice + selectedItems.reduce((s, p) => s + p.base_price, 0);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    const toAdd = selectedItems;
    if (toAdd.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    for (const p of toAdd) {
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
    toast.success(`${toAdd.length} produto${toAdd.length > 1 ? "s" : ""} adicionado${toAdd.length > 1 ? "s" : ""} ao carrinho`);
  };

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-6">Frequentemente comprados juntos</h2>
      <div className="flex flex-wrap items-start gap-3">
        {related.map((p, i) => {
          const imgIdx = p.primary_image_index ?? 0;
          const img = p.images?.[imgIdx] || p.images?.[0];
          const isChecked = selected.has(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3">
              {i > 0 && <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
              <label className="w-28 space-y-1.5 text-center cursor-pointer group">
                <div className={`relative h-28 w-28 rounded-lg overflow-hidden bg-muted border mx-auto transition-all ${isChecked ? "ring-2 ring-primary border-primary" : "opacity-60"}`}>
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(p.id)}
                      className="bg-background/90"
                    />
                  </div>
                </div>
                <p className="text-xs line-clamp-2 font-medium">{p.name}</p>
                <p className="text-xs font-semibold text-primary">€{p.base_price.toFixed(2)}</p>
              </label>
            </div>
          );
        })}

        <div className="ml-4 border-l pl-4 space-y-2">
          <p className="text-sm text-muted-foreground">Total do bundle</p>
          <p className="text-xl font-bold text-primary">€{bundlePrice.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">
            {selectedItems.length} de {related.length} selecionado{selectedItems.length !== 1 ? "s" : ""}
          </p>
          <Button size="sm" className="gap-2" onClick={handleAddSelected} disabled={selectedItems.length === 0}>
            <ShoppingBag className="h-4 w-4" />
            Adicionar selecionados
          </Button>
        </div>
      </div>
    </div>
  );
}
