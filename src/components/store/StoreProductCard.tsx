import { Link } from "react-router-dom";
import { ShoppingBag, Star, Package, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { getStorePrice } from "@/hooks/useStoreTierPricing";
import { StoreProductBadges } from "@/components/store/StoreProductBadges";
import { useToggleWishlist } from "@/hooks/useStoreReviewsWishlist";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreProductCardProps {
  product: StoreProduct;
  workspaceSlug: string;
  workspaceId?: string;
  wishlistProductIds?: string[];
  tierPricing?: { tier: import("@/types/pricing-tier").ClientPriceTier | null; tierPrices: Map<string, number>; isB2B: boolean } | null;
  index?: number;
}

export function StoreProductCard({ product, workspaceSlug, workspaceId, wishlistProductIds = [], tierPricing, index = 0 }: StoreProductCardProps) {
  const { addItem } = useStoreCart();
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = wishlistProductIds.includes(product.id);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
    >
      <Link
        to={`/store/${workspaceSlug}/product/${product.id}`}
        className="group block h-full"
      >
        <div className="relative overflow-hidden rounded-2xl border bg-card h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 hover:border-primary/20">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Package className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

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
                <Badge variant="secondary" className="text-sm font-medium px-4 py-1">
                  Esgotado
                </Badge>
              </div>
            )}

            {/* Quick actions */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-y-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              {workspaceId && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background transition-transform duration-200 active:scale-90"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist.mutate({ productId: product.id, workspaceId, isInWishlist });
                  }}
                >
                  <Heart className={cn("h-4 w-4 transition-colors", isInWishlist && "fill-destructive text-destructive")} />
                </Button>
              )}
              <Button
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg transition-transform duration-200 active:scale-90"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col flex-1 gap-1.5">
            {product.category && (
              <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-widest">
                {product.category}
              </p>
            )}
            <h3 className="font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">
              {product.name}
            </h3>
            {product.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-auto">
                {product.short_description}
              </p>
            )}
            <div className="flex items-baseline gap-2 pt-2 mt-auto">
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
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 w-fit" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
                {discountLabel}
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
