import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Repeat2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { formatMoney } from "@/lib/money";
import type { CartUnavailableItem } from "@/hooks/useStoreCartOffers";

interface StoreCartStockGuardProps {
  unavailable: CartUnavailableItem[];
  onResolved?: () => void;
}

function reasonText(item: CartUnavailableItem): string {
  if (item.reason === "insufficient_stock") {
    return `Só temos ${item.availableQuantity} unidade${item.availableQuantity === 1 ? "" : "s"} disponíveis.`;
  }
  if (item.reason === "unpublished") {
    return "Este artigo já não está disponível na loja.";
  }
  return "Este artigo esgotou.";
}

/**
 * Nunca perder a venda: mostra o que deixou de estar disponível e propõe
 * alternativas equivalentes reais (preço, IVA e stock atuais da base de dados).
 */
export function StoreCartStockGuard({ unavailable, onResolved }: StoreCartStockGuardProps) {
  const { addItem, removeItem, updateQuantity } = useStoreCart();

  if (unavailable.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
      {unavailable.map((item) => (
        <div key={item.productId} className="space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{reasonText(item)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.reason === "insufficient_stock" && item.availableQuantity > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  updateQuantity(item.productId, item.availableQuantity);
                  toast.success(`Quantidade ajustada para ${item.availableQuantity}`);
                  onResolved?.();
                }}
              >
                Levar {item.availableQuantity}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground"
              onClick={() => {
                removeItem(item.productId);
                onResolved?.();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Retirar do carrinho
            </Button>
          </div>

          {item.alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Alternativas disponíveis agora</p>
              <ul className="space-y-2">
                {item.alternatives.map((alt) => (
                  <li key={alt.id} className="flex items-center gap-3 rounded-lg border bg-background p-2">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {alt.image ? (
                        <img src={alt.image} alt={alt.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium">{alt.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">€{formatMoney(alt.price)}</span>
                        <StoreVatLabel className="text-[10px]" />
                        {alt.intent === "downsell" && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Mais acessível
                          </Badge>
                        )}
                        {alt.intent === "upsell" && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Versão superior
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1"
                      aria-label={`Substituir ${item.name} por ${alt.name}`}
                      onClick={() => {
                        const maxQty =
                          typeof alt.availableQuantity === "number"
                            ? Math.max(1, Math.min(item.requestedQuantity, alt.availableQuantity))
                            : item.requestedQuantity;
                        removeItem(item.productId);
                        addItem(
                          {
                            productId: alt.id,
                            name: alt.name,
                            price: alt.price,
                            currency: alt.currency,
                            image: alt.image,
                            sku: alt.sku,
                          },
                          maxQty,
                        );
                        toast.success(`${alt.name} substituiu ${item.name}`);
                        onResolved?.();
                      }}
                    >
                      <Repeat2 className="h-3.5 w-3.5" /> Trocar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
