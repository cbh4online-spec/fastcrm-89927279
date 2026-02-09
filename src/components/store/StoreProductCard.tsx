import { Link } from "react-router-dom";
import { ShoppingBag, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { getStorePrice } from "@/hooks/useStoreTierPricing";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreProductCardProps {
  product: StoreProduct;
  workspaceSlug: string;
  tierPricing?: { tier: import("@/types/pricing-tier").ClientPriceTier | null; tierPrices: Map<string, number>; isB2B: boolean } | null;
}

export function StoreProductCard({ product, workspaceSlug, tierPricing }: StoreProductCardProps) {
  const { addItem } = useStoreCart();
  const primaryIndex = product.primary_image_index ?? 0;
  const imageUrl = product.images?.[primaryIndex] || product.images?.[0];
  const isOutOfStock = product.stock_status === "out_of_stock";
  const { price: effectivePrice, isDiscounted, discountLabel } = getStorePrice(product.base_price, product.id, tierPricing);
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      currency: product.currency,
      image: imageUrl,
      sku: product.sku || undefined,
    });
  };

  return (
    <Link
      to={`/store/${workspaceSlug}/product/${product.id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}

          {product.store_featured && (
            <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground gap-1">
              <Star className="h-3 w-3" />
              Destaque
            </Badge>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Badge variant="secondary" className="text-sm">
                Esgotado
              </Badge>
            </div>
          )}

          {/* Quick add button */}
          <div className="absolute bottom-3 right-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <Button
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-1.5">
          {product.category && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {product.category}
            </p>
          )}
          <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
            {product.name}
          </h3>
          {product.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.short_description}
            </p>
          )}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-lg font-bold text-primary">
              €{effectivePrice.toFixed(2)}
            </span>
            {isDiscounted && (
              <span className="text-sm text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
            )}
            {product.billing_type === "recurring" && (
              <span className="text-xs text-muted-foreground">/mês</span>
            )}
          </div>
          {discountLabel && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
              {discountLabel}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
