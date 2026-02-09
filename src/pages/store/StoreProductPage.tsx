import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { addDays, format, isWeekend, nextMonday } from "date-fns";
import { pt } from "date-fns/locale";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductViewTracker } from "@/components/store/StoreProductViewTracker";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreImageZoom } from "@/components/store/StoreImageZoom";
import { StoreStickyAddToCart } from "@/components/store/StoreStickyAddToCart";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreShareButtons } from "@/components/store/StoreShareButtons";
import { useStoreProduct } from "@/hooks/useStoreProducts";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useStoreTierPricing, getStorePrice } from "@/hooks/useStoreTierPricing";
import { StoreProductBadges } from "@/components/store/StoreProductBadges";
import { StoreBoughtTogether } from "@/components/store/sections/StoreBoughtTogether";
import { StoreRelatedProducts } from "@/components/store/sections/StoreRelatedProducts";
import { StoreReviewsSection } from "@/components/store/StoreReviewsSection";
import { useStoreReviewStats, useStoreWishlist, useToggleWishlist } from "@/hooks/useStoreReviewsWishlist";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useProductSalesCount } from "@/hooks/useProductSalesCount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  Package,
  Minus,
  Plus,
  Truck,
  Shield,
  Heart,
  Star,
  Play,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

function getEstimatedDelivery(): string {
  let date = addDays(new Date(), 3);
  // Skip weekends
  while (isWeekend(date)) {
    date = addDays(date, 1);
  }
  return format(date, "EEE, d MMM", { locale: pt });
}

export default function StoreProductPage() {
  const { workspaceSlug, productId } = useParams<{
    workspaceSlug: string;
    productId: string;
  }>();
  const { data: product, isLoading } = useStoreProduct(productId);
  const { addItem } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const wsSlug = workspaceSlug || "";
  const { data: tierPricing } = useStoreTierPricing(wsSlug);
  const isOutOfStock = product?.stock_status === "out_of_stock";
  const pricing = product ? getStorePrice(product.base_price, product.id, tierPricing) : null;
  const { average: reviewAvg, count: reviewCount } = useStoreReviewStats(productId);
  const { data: wishlist = [] } = useStoreWishlist((product as any)?.workspace_id);
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = product ? wishlist.some((w) => w.product_id === product.id) : false;
  const { items: recentlyViewed, addItem: addRecentlyViewed } = useRecentlyViewed();
  const { data: salesCounts } = useProductSalesCount((product as any)?.workspace_id);
  const addToCartRef = useRef<HTMLButtonElement>(null);

  // Track recently viewed
  useEffect(() => {
    if (!product) return;
    const primaryIndex = product.primary_image_index ?? 0;
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      price: pricing?.price ?? product.base_price,
      image: product.images?.[primaryIndex] || product.images?.[0],
    });
  }, [product?.id]);

  const soldCount = product ? (salesCounts?.get(product.id) || 0) : 0;
  const soldLabel = soldCount >= 500 ? "500+ vendidos" : soldCount >= 100 ? "100+ vendidos" : soldCount >= 50 ? "50+ vendidos" : soldCount >= 10 ? `${soldCount}+ vendidos` : null;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    const primaryIndex = product.primary_image_index ?? 0;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: pricing?.price ?? product.base_price,
        currency: product.currency,
        image: product.images?.[primaryIndex] || product.images?.[0],
        sku: product.sku || undefined,
      },
      quantity
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Produto não encontrado</h2>
          <Link to={`/store/${wsSlug}`}>
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à Loja
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const specs = product.specifications || {};
  const hasVideo = !!product.demo_video_url;
  const primaryIndex = product.primary_image_index ?? 0;
  const currentImage = images[selectedImage];

  return (
    <>
      <Helmet>
        <title>{product.name} | Loja</title>
        <meta name="description" content={product.short_description || product.name} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.short_description || product.name} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={window.location.href} />
        {images[primaryIndex] && <meta property="og:image" content={images[primaryIndex]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:description" content={product.short_description || product.name} />
        {images[primaryIndex] && <meta name="twitter:image" content={images[primaryIndex]} />}
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />
        <StoreProductViewTracker productId={product.id} workspaceId={(product as any).workspace_id} />

        {/* Sticky Add to Cart bar */}
        <StoreStickyAddToCart
          name={product.name}
          price={pricing?.price ?? product.base_price}
          currency={product.currency}
          image={images[primaryIndex] || images[0]}
          isOutOfStock={isOutOfStock}
          onAddToCart={handleAddToCart}
          triggerRef={addToCartRef as React.RefObject<HTMLElement>}
        />

        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
          >
            <Link to={`/store/${wsSlug}`} className="hover:text-foreground transition-colors">
              Loja
            </Link>
            <span>/</span>
            {product.category && (
              <>
                <Link
                  to={`/store/${wsSlug}?category=${product.category}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </motion.nav>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery with Zoom */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Main image with zoom or video */}
              {showVideo && hasVideo ? (
                <div className="aspect-square rounded-2xl overflow-hidden bg-black">
                  <video
                    src={product.demo_video_url!}
                    controls
                    autoPlay
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : currentImage ? (
                <StoreImageZoom src={currentImage} alt={product.name} />
              ) : (
                <div className="aspect-square rounded-2xl bg-muted border flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/20" />
                </div>
              )}

              {/* Thumbnails */}
              {(images.length > 1 || hasVideo) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {/* Video thumbnail */}
                  {hasVideo && (
                    <button
                      onClick={() => { setShowVideo(true); }}
                      className={cn(
                        "h-20 w-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200 relative",
                        showVideo
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                      )}
                    >
                      {images[0] && <img src={images[0]} alt="" className="h-full w-full object-cover" />}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </button>
                  )}
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedImage(i); setShowVideo(false); }}
                      className={cn(
                        "h-20 w-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200",
                        !showVideo && selectedImage === i
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div>
                {product.category && (
                  <p className="text-sm font-semibold text-primary/70 uppercase tracking-widest mb-2">
                    {product.category}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  {product.name}
                </h1>
                {product.sku && (
                  <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                )}

                {/* Stars + review count + social proof */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {reviewCount > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn("h-4 w-4", s <= Math.round(reviewAvg) ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground ml-1">({reviewCount})</span>
                    </div>
                  )}
                  {soldLabel && (
                    <Badge variant="secondary" className="text-xs">
                      {soldLabel}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  €{(pricing?.price ?? product.base_price).toFixed(2)}
                </span>
                {pricing?.isDiscounted && (
                  <span className="text-lg text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
                )}
                {product.billing_type === "recurring" && (
                  <span className="text-muted-foreground">/mês</span>
                )}
              </div>
              {pricing?.discountLabel && (
                <Badge variant="outline" className="mt-1" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
                  {pricing.discountLabel}
                </Badge>
              )}

              {product.short_description && (
                <p className="text-muted-foreground leading-relaxed">
                  {product.short_description}
                </p>
              )}

              {/* Benefits as bullet points (Amazon style - beside image area) */}
              {product.benefits && product.benefits.length > 0 && (
                <ul className="space-y-1.5">
                  {product.benefits.slice(0, 5).map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <StoreProductBadges
                createdAt={product.created_at}
                trackStock={product.track_stock}
                stockQuantity={product.stock_quantity}
                isDiscounted={pricing?.isDiscounted}
                isFeatured={product.store_featured}
                compact={false}
              />

              {isOutOfStock ? (
                <Badge variant="secondary">Esgotado</Badge>
              ) : (
                <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                  <Check className="h-3 w-3 mr-1" />
                  Em stock
                </Badge>
              )}

              <Separator />

              {/* Share Buttons */}
              <StoreShareButtons
                url={window.location.href}
                title={product.name}
                description={product.short_description || undefined}
              />

              <Separator />

              {/* Delivery estimation */}
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-xl p-3">
                <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Entrega estimada: <span className="font-semibold text-foreground">{getEstimatedDelivery()}</span>
                </span>
              </div>

              {/* Quantity + Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Quantidade:</span>
                  <div className="flex items-center border rounded-xl overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl ml-auto"
                    onClick={() => product && toggleWishlist.mutate({
                      productId: product.id,
                      workspaceId: (product as any).workspace_id,
                      isInWishlist,
                    })}
                  >
                    <Heart className={cn("h-4 w-4 transition-colors", isInWishlist && "fill-destructive text-destructive")} />
                  </Button>
                </div>

                <Button
                  ref={addToCartRef}
                  size="lg"
                  className="w-full gap-2 text-base h-12 rounded-xl transition-transform duration-200 active:scale-[0.98]"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingBag className="h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
              </div>

              {/* Trust signals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-xl bg-muted/50 p-3">
                  <Truck className="h-4 w-4 text-primary" />
                  Envio rápido
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-xl bg-muted/50 p-3">
                  <Shield className="h-4 w-4 text-primary" />
                  Pagamento seguro
                </div>
              </div>
            </motion.div>
          </div>

          {/* Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid md:grid-cols-2 gap-8"
          >
            {product.commercial_description && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Descrição</h2>
                <div className="prose prose-sm text-muted-foreground max-w-none">
                  <p className="whitespace-pre-wrap">{product.commercial_description}</p>
                </div>
              </div>
            )}

            {product.benefits && product.benefits.length > 5 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Todos os Benefícios</h2>
                <ul className="space-y-2">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">Especificações</h2>
              <div className="border rounded-xl overflow-hidden">
                {Object.entries(specs).map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      "flex justify-between px-4 py-3 text-sm",
                      i % 2 === 0 ? "bg-muted/30" : "bg-background"
                    )}
                  >
                    <span className="font-medium">{key}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <StoreReviewsSection productId={product.id} workspaceId={(product as any).workspace_id} />

          {/* Cross-sell */}
          <StoreBoughtTogether
            productId={product.id}
            categoryId={product.store_category_id}
            workspaceId={(product as any).workspace_id}
            currentPrice={pricing?.price ?? product.base_price}
            currency={product.currency}
          />

          {/* Related */}
          <StoreRelatedProducts
            productId={product.id}
            categoryId={product.store_category_id}
            workspaceId={(product as any).workspace_id}
            workspaceSlug={wsSlug}
          />

          {/* Recently Viewed */}
          <StoreRecentlyViewed
            items={recentlyViewed}
            workspaceSlug={wsSlug}
            currentProductId={product.id}
          />
        </div>

        <StoreFooter
          workspaceSlug={wsSlug}
          storeName="Loja"
        />
      </div>
    </>
  );
}
