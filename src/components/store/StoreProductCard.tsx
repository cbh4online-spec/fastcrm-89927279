import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Star, Package, Heart, Eye, TrendingUp, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { getStorePrice } from "@/hooks/useStoreTierPricing";
import { StoreProductBadges } from "@/components/store/StoreProductBadges";
import { StoreProductConditionBadge } from "@/components/store/StoreProductConditionBadge";
import { StoreQuickViewModal } from "@/components/store/StoreQuickViewModal";
import { useToggleWishlist } from "@/hooks/useStoreReviewsWishlist";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreProductCardProps {
  product: StoreProduct;
  workspaceSlug: string;
  workspaceId?: string;
  wishlistProductIds?: string[];
  tierPricing?: { tier: import("@/types/pricing-tier").ClientPriceTier | null; tierPrices: Map<string, number>; isB2B: boolean } | null;
  index?: number;
  reviewStats?: Map<string, { sum: number; count: number }>;
  salesCounts?: Map<string, number>;
}

export function StoreProductCard({ product, workspaceSlug, workspaceId, wishlistProductIds = [], tierPricing, index = 0, reviewStats, salesCounts }: StoreProductCardProps) {
  const { addItem } = useStoreCart();
  const toggleWishlist = useToggleWishlist();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isInWishlist = wishlistProductIds.includes(product.id);
  const primaryIndex = product.primary_image_index ?? 0;
  const imageUrl = product.images?.[primaryIndex] || product.images?.[0];
  const secondImageUrl = product.images?.length > 1 ? product.images?.find((_, i) => i !== primaryIndex) : null;
  const isOutOfStock = product.stock_status === "out_of_stock";
  const { price: effectivePrice, isDiscounted, discountLabel } = getStorePrice(product.base_price, product.id, tierPricing);

  // Popular badge (>25 sales)
  const soldCount = salesCounts?.get(product.id) || 0;
  const isPopular = soldCount > 25;

  // Stock urgency
  const showStockBar = product.track_stock && product.stock_quantity != null && product.stock_quantity > 0 && product.stock_quantity < 20;
  const stockPercent = showStockBar ? Math.min((product.stock_quantity! / 20) * 100, 100) : 0;

  // Savings percentage
  const savingsPercent = isDiscounted ? Math.round(((product.base_price - effectivePrice) / product.base_price) * 100) : 0;

  // Review stats
  const reviewData = reviewStats?.get(product.id);
  const reviewCount = reviewData?.count || 0;
  const reviewAvg = reviewCount > 0 ? reviewData!.sum / reviewCount : 0;

  const soldLabel = soldCount >= 500 ? "500+" : soldCount >= 100 ? "100+" : soldCount >= 50 ? "50+" : soldCount >= 10 ? `${soldCount}+` : null;

  const canAddToCart = !isOutOfStock && !(product.track_stock && product.stock_quantity != null && product.stock_quantity <= 0);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAddToCart) return;
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
        <div
          className="relative overflow-hidden rounded-2xl border bg-card h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 hover:border-primary/20"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Image with crossfade on hover */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {imageUrl ? (
              <div className="relative h-full w-full">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-110",
                    isHovered && secondImageUrl ? "opacity-0" : "opacity-100"
                  )}
                  loading="lazy"
                />
                {secondImageUrl && (
                  <img
                    src={secondImageUrl}
                    alt={product.name}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-110",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}
                    loading="lazy"
                  />
                )}
              </div>
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
              <StoreProductConditionBadge condition={(product as any).product_condition} compact />
            </div>

            {/* Popular badge or sold count */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              {isPopular && (
                <Badge className="text-[10px] bg-amber-500/90 text-white border-0 gap-1 shadow-md backdrop-blur-sm">
                  <TrendingUp className="h-3 w-3" />
                  Escolha Popular
                </Badge>
              )}
              {!isPopular && soldLabel && (
                <Badge variant="secondary" className="text-[10px] bg-background/90 backdrop-blur-sm shadow-sm">
                  {soldLabel} vendidos
                </Badge>
              )}
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
              {/* Quick View */}
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background transition-transform duration-200 active:scale-90"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickViewOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
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
                disabled={!canAddToCart}
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

            {/* Stars + review count */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-3 w-3",
                        s <= Math.round(reviewAvg)
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">({reviewCount})</span>
              </div>
            )}

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
                <>
                  <span className="text-sm text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
                  {savingsPercent > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-0">
                      <Flame className="h-2.5 w-2.5 mr-0.5" />
                      -{savingsPercent}%
                    </Badge>
                  )}
                </>
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

            {/* Stock urgency bar */}
            {showStockBar && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="h-3 w-3 text-destructive" />
                  <span className="text-[11px] font-medium text-destructive">
                    Quase a esgotar — restam {product.stock_quantity}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-destructive to-orange-400 transition-all duration-500"
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Quick View Modal */}
      <StoreQuickViewModal
        product={product}
        workspaceSlug={workspaceSlug}
        tierPricing={tierPricing}
        reviewStats={reviewStats}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </motion.div>
  );
}
