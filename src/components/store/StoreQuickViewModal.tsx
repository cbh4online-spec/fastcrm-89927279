import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Minus, Plus, ExternalLink, Star, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { getStorePrice } from "@/hooks/useStoreTierPricing";
import { StoreProductBadges } from "@/components/store/StoreProductBadges";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreQuickViewModalProps {
  product: StoreProduct;
  workspaceSlug: string;
  tierPricing?: any;
  reviewStats?: Map<string, { sum: number; count: number }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreQuickViewModal({ product, workspaceSlug, tierPricing, reviewStats, open, onOpenChange }: StoreQuickViewModalProps) {
  const { addItem } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const primaryIndex = product.primary_image_index ?? 0;
  const imageUrl = product.images?.[primaryIndex] || product.images?.[0];
  const isOutOfStock = product.stock_status === "out_of_stock";
  const { price: effectivePrice, isDiscounted, discountLabel } = getStorePrice(product.base_price, product.id, tierPricing);

  const reviewData = reviewStats?.get(product.id);
  const reviewCount = reviewData?.count || 0;
  const reviewAvg = reviewCount > 0 ? reviewData!.sum / reviewCount : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        currency: product.currency,
        image: imageUrl,
        sku: product.sku || undefined,
      },
      quantity
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="aspect-square bg-muted relative overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {product.store_featured && (
                <Badge className="bg-primary/90 text-primary-foreground gap-1 shadow-md">
                  <Star className="h-3 w-3" />
                  Destaque
                </Badge>
              )}
              <StoreProductBadges
                createdAt={product.created_at}
                trackStock={product.track_stock}
                stockQuantity={product.stock_quantity}
                isDiscounted={isDiscounted}
                compact
              />
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                <Badge variant="secondary" className="text-sm font-medium px-4 py-1">Esgotado</Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader className="text-left">
              {product.category && (
                <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-widest">{product.category}</p>
              )}
              <DialogTitle className="text-xl font-bold leading-tight">{product.name}</DialogTitle>
            </DialogHeader>

            {reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(reviewAvg) ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-1">({reviewCount})</span>
              </div>
            )}

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">€{effectivePrice.toFixed(2)}</span>
              {isDiscounted && (
                <span className="text-sm text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
              )}
              {product.billing_type === "recurring" && (
                <span className="text-xs text-muted-foreground">/mês</span>
              )}
            </div>
            {discountLabel && (
              <Badge variant="outline" className="text-[10px] w-fit">{discountLabel}</Badge>
            )}

            {product.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-3">{product.short_description}</p>
            )}

            {product.benefits && product.benefits.length > 0 && (
              <ul className="space-y-1">
                {product.benefits.slice(0, 3).map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto space-y-3">
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Qtd:</span>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleAddToCart} disabled={isOutOfStock}>
                <ShoppingBag className="h-4 w-4" />
                Adicionar ao Carrinho
              </Button>

              <Button variant="outline" className="w-full gap-2" asChild>
                <Link to={`/store/${workspaceSlug}/product/${product.id}`}>
                  <ExternalLink className="h-4 w-4" />
                  Ver Detalhes
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
