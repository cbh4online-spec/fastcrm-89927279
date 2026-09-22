import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { formatMoney } from "@/lib/money";
import type { CartComplement } from "@/hooks/useStoreCartOffers";

const RELATION_LABEL: Record<string, string> = {
  accessory: "Acessório",
  required: "Necessário",
  bundle: "Compram juntos",
  compatible: "Compatível",
  upgrade: "Versão superior",
};

interface StoreCartComplementsProps {
  complements: CartComplement[];
  isLoading?: boolean;
  /** Título adaptado à superfície (carrinho vs finalização). */
  title?: string;
  compact?: boolean;
}

export function StoreCartComplements({
  complements,
  isLoading = false,
  title = "Complete a sua compra",
  compact = false,
}: StoreCartComplementsProps) {
  const { addItem } = useStoreCart();

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="h-16 rounded-lg border bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (complements.length === 0) return null;

  return (
    <section className="space-y-3" aria-label={title}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="space-y-2">
        {complements.map((product) => (
          <li key={product.id} className="flex items-center gap-3 rounded-lg border p-2">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs font-medium">{product.name}</p>
              {!compact && (
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  Para {product.forProductName}
                </p>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">
                  €{formatMoney(product.price)}
                </span>
                <StoreVatLabel className="text-[10px]" />
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {RELATION_LABEL[product.relationType] || "Sugestão"}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              aria-label={`Adicionar ${product.name} ao carrinho`}
              onClick={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  currency: product.currency,
                  image: product.image,
                  sku: product.sku,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
