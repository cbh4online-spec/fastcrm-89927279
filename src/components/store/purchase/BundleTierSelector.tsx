import { useEffect, useMemo, useState } from "react";
import { Package, ShoppingBag, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useStorePurchaseTiers,
  useStoreShippingBaseline,
  type PurchaseTier,
  type TierProduct,
} from "./useStorePurchaseTiers";

interface BundleTierSelectorProps {
  productId: string;
  workspaceId: string;
  currentProduct: TierProduct | null;
  onSelectionChange?: (tier: PurchaseTier | null) => void;
}

function imageOf(p: TierProduct) {
  const idx = p.primary_image_index ?? 0;
  return p.images?.[idx] || p.images?.[0];
}

/** Passo 2: escolher quanto levar (packs do mesmo vendedor) com portes e total. */
export function BundleTierSelector({
  productId,
  workspaceId,
  currentProduct,
  onSelectionChange,
}: BundleTierSelectorProps) {
  const { addItem } = useStoreCart();
  const { data: tiers = [] } = useStorePurchaseTiers({ productId, workspaceId, currentProduct });
  const { data: shipping } = useStoreShippingBaseline(workspaceId);
  const [selectedId, setSelectedId] = useState<string>("single");

  const selected = useMemo(
    () => tiers.find((t) => t.id === selectedId) || tiers[0] || null,
    [tiers, selectedId],
  );

  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  if (tiers.length < 2 || !selected) return null;

  const shippingCost = (() => {
    if (!shipping) return null;
    if (shipping.freeThreshold !== null && selected.itemsTotal >= shipping.freeThreshold) return 0;
    return shipping.basePrice;
  })();
  const total = selected.itemsTotal + (shippingCost ?? 0);

  const addSelection = () => {
    selected.products.forEach((p) => {
      addItem(
        {
          productId: p.id,
          name: p.name,
          price: p.base_price,
          currency: p.currency,
          image: imageOf(p),
          sku: p.sku || undefined,
        },
        p.quantity,
      );
    });
    toast.success(
      selected.id === "single" ? "Produto adicionado ao carrinho" : "Conjunto adicionado ao carrinho",
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiers.map((t) => {
          const active = t.id === selected.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              aria-pressed={active}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary/[0.04]" : "hover:border-muted-foreground/40",
              )}
            >
              {t.badge && (
                <Badge className="absolute -top-2 right-2 border-0 bg-primary text-primary-foreground text-[9px]">
                  {t.badge}
                </Badge>
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                    active && "border-primary bg-primary text-primary-foreground",
                  )}
                  aria-hidden="true"
                >
                  {active ? <Check className="h-2.5 w-2.5" /> : null}
                </span>
                <span className="truncate text-xs font-semibold">{t.label}</span>
              </div>
              <div className="mt-2 flex -space-x-1.5">
                {t.products.slice(0, 3).map((p) => {
                  const img = imageOf(p);
                  return (
                    <span
                      key={p.id}
                      className="h-8 w-8 overflow-hidden rounded-md border bg-background"
                    >
                      {img ? (
                        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="m-1.5 h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 text-sm font-bold">€{t.itemsTotal.toFixed(2)}</p>
              {t.discount > 0 && (
                <p className="text-[10px] text-destructive">Poupa €{t.discount.toFixed(2)}</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border p-3 text-sm">
        <ul className="space-y-1.5">
          {selected.products.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs">
                {p.quantity > 1 ? `${p.quantity}× ` : ""}
                {p.name}
              </span>
              <span className="text-xs text-muted-foreground">
                €{(p.base_price * p.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Itens ({selected.products.reduce((s, p) => s + p.quantity, 0)})</span>
            <span>€{selected.itemsTotal.toFixed(2)}</span>
          </div>
          {shippingCost !== null && (
            <div className="flex justify-between">
              <span>Portes</span>
              <span>{shippingCost === 0 ? "Grátis" : `€${shippingCost.toFixed(2)}`}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-bold text-foreground">
            <span>Total</span>
            <span>
              €{total.toFixed(2)} <StoreVatLabel />
            </span>
          </div>
        </div>
        <Button className="mt-3 h-11 w-full gap-2 rounded-xl" onClick={addSelection}>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Adicionar ao carrinho
        </Button>
        {shippingCost !== null && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Portes combinados da mesma loja. Valor final confirmado no checkout.
          </p>
        )}
      </div>
    </div>
  );
}
