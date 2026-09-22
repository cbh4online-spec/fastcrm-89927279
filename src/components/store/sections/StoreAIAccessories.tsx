/**
 * Bloco de acessórios recomendados (cross-sell) na ficha pública de produto.
 * Os itens vêm do catálogo real; preço, moeda e stock nunca são estimados.
 */
import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useStoreAccessorySuggestions } from "@/hooks/store/useStoreAccessorySuggestions";
import { toast } from "sonner";

interface StoreAIAccessoriesProps {
  productId: string;
  workspaceId: string;
  workspaceSlug: string;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | null;
}

export function StoreAIAccessories({
  productId,
  workspaceId,
  workspaceSlug,
  name,
  category,
  subcategory,
  price,
}: StoreAIAccessoriesProps) {
  const { addItem } = useStoreCart();
  const { data: items = [] } = useStoreAccessorySuggestions({
    productId,
    workspaceId,
    name,
    category,
    subcategory,
    price,
  });

  if (!items.length) return null;

  return (
    <section className="mt-12" aria-labelledby="acessorios-recomendados">
      <h2 id="acessorios-recomendados" className="text-xl font-semibold mb-1">
        Acessórios recomendados
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Complementos do catálogo para instalar e usar este produto.
      </p>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {items.map((item) => (
            <div key={item.id} className="w-44 flex-shrink-0 rounded-xl border p-3">
              <Link
                to={`/store/${workspaceSlug}/product/${item.slug || item.id}`}
                className="group block"
              >
                <div className="h-36 w-full overflow-hidden rounded-lg bg-muted">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name || "Acessório"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-9 w-9 text-muted-foreground/25" />
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium group-hover:text-primary">
                  {item.name}
                </p>
              </Link>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.reason}</p>
              <p className="mt-1 text-sm font-bold text-primary">
                €{(item.price || 0).toFixed(2)} <StoreVatLabel />
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full gap-1"
                onClick={() => {
                  addItem({
                    productId: item.id,
                    name: item.name || "Acessório",
                    price: item.price || 0,
                    currency: item.currency || "EUR",
                    image: item.image || undefined,
                    sku: item.sku || undefined,
                  });
                  toast.success("Acessório adicionado ao carrinho");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
