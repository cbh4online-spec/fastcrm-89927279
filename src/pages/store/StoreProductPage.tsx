import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductSeoHead } from "@/components/store/storefront/ProductSeoHead";
import { StoreProductDescription } from "@/components/store/StoreProductDescription";
import { StoreProductHighlights } from "@/components/store/StoreProductHighlights";
import { humanizeSpecKey, filterValidSpecs } from "@/utils/specLabels";
import { addDays, format, isWeekend, nextMonday } from "date-fns";
import { pt } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductViewTracker } from "@/components/store/StoreProductViewTracker";
import { StoreVisitorTracker } from "@/components/store/StoreVisitorTracker";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreImageZoom } from "@/components/store/StoreImageZoom";
import { StoreStickyAddToCart } from "@/components/store/StoreStickyAddToCart";
import { StoreMobileConversionBar } from "@/components/store/StoreMobileConversionBar";
import { StoreQuickBuyButton } from "@/components/store/StoreQuickBuyButton";
import { StoreOfferCountdown } from "@/components/store/StoreOfferCountdown";
import { StoreAddToCartAnimation } from "@/components/store/StoreAddToCartAnimation";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreCookieConsent } from "@/components/store/StoreCookieConsent";
import { PriceHistoryChart } from "@/components/store/PriceHistoryChart";
import { PriceComparisonWidget } from "@/components/store/PriceComparisonWidget";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreLoyaltyWidget } from "@/components/store/StoreLoyaltyWidget";
import { StoreShareButtons } from "@/components/store/StoreShareButtons";
import { getShareUrl } from "@/utils/getShareUrl";
import { useStoreProduct } from "@/hooks/useStoreProducts";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useStoreTierPricing, getStorePrice } from "@/hooks/useStoreTierPricing";
import { StoreProductBadges } from "@/components/store/StoreProductBadges";
import { StoreProductConditionBadge } from "@/components/store/StoreProductConditionBadge";
import { StoreOfferDialog } from "@/components/store/StoreOfferDialog";
import { StorePurchasePanel } from "@/components/store/purchase/StorePurchasePanel";

import { StorePriceRequestDialog } from "@/components/store/StorePriceRequestDialog";
import { StoreProductAlertWidget } from "@/components/store/StoreProductAlertWidget";
import { StoreBoughtTogether } from "@/components/store/sections/StoreBoughtTogether";
import { StoreRelatedProducts } from "@/components/store/sections/StoreRelatedProducts";
import { StoreCompatibleProducts } from "@/components/store/sections/StoreCompatibleProducts";
import { StoreProductDocuments } from "@/components/store/sections/StoreProductDocuments";
import { StoreTrustStrip } from "@/components/store/StoreTrustStrip";
import { StoreDecisionNudge } from "@/components/store/StoreDecisionNudge";
import { StoreProductSections } from "@/components/store/sections/StoreProductSections";
import { StoreProductBundles } from "@/components/store/sections/StoreProductBundles";
import { StoreProductQA } from "@/components/store/sections/StoreProductQA";
import { StoreCheaperAlternatives } from "@/components/store/sections/StoreCheaperAlternatives";
import { parseProductPageConfig } from "@/lib/store/productPageConfig";

import { StoreAIAdvisor } from "@/components/store/StoreAIAdvisor";
import { StoreReviewsSection } from "@/components/store/StoreReviewsSection";
import { useStoreReviewStats, useStoreWishlist, useToggleWishlist } from "@/hooks/useStoreReviewsWishlist";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useProductSalesCount } from "@/hooks/useProductSalesCount";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { StoreVatProvider } from "@/contexts/StoreVatContext";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
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
  Eye,
  RotateCcw,
  Lock,
  MessageSquareText,
  Tag,
  Scale,
  Monitor,
  Volume2,
  Zap,
  HardDrive,
  Wifi,
  Thermometer,
  Aperture,
  FileCode,
  Moon,
  Sun,
  Puzzle,
  Ruler,
  Palette,
  Clock,
  Cpu,
  Battery,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { trackViewItem, trackAddToCart } from "@/lib/ecommerceTracking";
import { parseOfferPageConfig } from "@/components/store/offer-page/offerPageTypes";
import { StoreSmartOfferPage } from "@/components/store/offer-page/StoreSmartOfferPage";

// Spec icon mapping
const SPEC_ICON_MAP: Record<string, LucideIcon> = {
  brand: Tag, marca: Tag, fabricante: Tag,
  weight: Scale, peso: Scale, massa: Scale,
  resolution: Monitor, resolução: Monitor, resolucao: Monitor,
  audio: Volume2, som: Volume2,
  power: Zap, potência: Zap, potencia: Zap, voltagem: Zap,
  sensor: Eye,
  storage: HardDrive, armazenamento: HardDrive, memória: HardDrive, memoria: HardDrive,
  connectivity: Wifi, conectividade: Wifi, wifi: Wifi, bluetooth: Wifi,
  protection: Shield, proteção: Shield, protecao: Shield, ip: Shield,
  temperature: Thermometer, temperatura: Thermometer,
  lens: Aperture, lente: Aperture, abertura: Aperture,
  compression: FileCode, compressão: FileCode, codec: FileCode,
  nightvision: Moon, visãonoturna: Moon, infravermelho: Moon, ir: Moon,
  wdr: Sun, hdr: Sun,
  compatibility: Puzzle, compatibilidade: Puzzle,
  dimensions: Ruler, dimensões: Ruler, tamanho: Ruler, size: Ruler,
  color: Palette, cor: Palette,
  speed: Clock, velocidade: Clock, fps: Clock,
  processor: Cpu, processador: Cpu, chipset: Cpu,
  battery: Battery, bateria: Battery, autonomia: Battery,
};

function getSpecIcon(key: string): LucideIcon {
  const normalized = key.toLowerCase().replace(/[^a-záàâãéèêíïóôõúç]/g, "");
  for (const [mapKey, icon] of Object.entries(SPEC_ICON_MAP)) {
    if (normalized.includes(mapKey)) return icon;
  }
  return Info;
}

// Add-to-cart animation trigger counter

function getEstimatedDelivery(): string {
  let date = addDays(new Date(), 3);
  // Skip weekends
  while (isWeekend(date)) {
    date = addDays(date, 1);
  }
  return format(date, "EEE, d MMM", { locale: pt });
}

function useRecentViewers(productId: string | undefined) {
  return useQuery({
    queryKey: ["store-recent-viewers", productId],
    queryFn: async () => {
      if (!productId) return 0;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("store_page_views" as any)
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId)
        .gte("viewed_at", since);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

/** Specs section — zebra table for >6 specs, cards for ≤6 */
function StoreProductSpecs({ specs }: { specs: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(specs);
  const useTable = entries.length > 6;
  const visible = expanded ? entries : entries.slice(0, 8);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Especificações</h2>
      {useTable ? (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {visible.map(([key, value], i) => {
                const SpecIcon = getSpecIcon(key);
                return (
                  <tr key={key} className={cn(i % 2 === 0 ? "bg-muted/30" : "bg-card")}>
                    <td className="px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap w-[40%]">
                      <span className="flex items-center gap-2">
                        <SpecIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {humanizeSpecKey(key)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length > 8 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2.5 text-sm font-medium text-primary hover:bg-muted/50 transition-colors border-t"
            >
              {expanded ? "Mostrar menos" : `Ver todas as ${entries.length} especificações`}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {entries.map(([key, value]) => {
            const SpecIcon = getSpecIcon(key);
            return (
              <div
                key={key}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                  <SpecIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{humanizeSpecKey(key)}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StoreProductPage() {
  const { workspaceSlug, productId } = useParams<{
    workspaceSlug: string;
    productId: string;
  }>();
  const { workspaceId: resolvedWsId, slug: wsSlug, isLoading: isResolving } = useResolveStoreWorkspace(workspaceSlug);
  const { data: product, isLoading: isProductLoading } = useStoreProduct(productId, resolvedWsId);
  const { addItem } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [cartAnimTrigger, setCartAnimTrigger] = useState(0);
  const { data: tierPricing } = useStoreTierPricing(resolvedWsId);
  const { data: storeSettings } = usePublicStoreSettings(resolvedWsId || "");
  const pageConfig = parseProductPageConfig((storeSettings as any)?.product_page_config);
  const storeName = storeSettings?.store_name || "Loja";
  const isOutOfStock = product?.stock_status === "out_of_stock";
  const isPriceOnRequest = !!product?.price_on_request;
  const pricing = product ? getStorePrice(product.base_price, product.id, tierPricing, product) : null;
  const { average: reviewAvg, count: reviewCount } = useStoreReviewStats(productId);
  const { data: wishlist = [] } = useStoreWishlist((product as any)?.workspace_id);
  const toggleWishlist = useToggleWishlist();
  const isInWishlist = product ? wishlist.some((w) => w.product_id === product.id) : false;
  const { items: recentlyViewed, addItem: addRecentlyViewed } = useRecentlyViewed((product as any)?.workspace_id || "");
  const { data: salesCounts } = useProductSalesCount((product as any)?.workspace_id);
  const { data: recentViewers = 0 } = useRecentViewers(productId);
  const addToCartRef = useRef<HTMLButtonElement>(null);

  // Track recently viewed + product_view analytics
  useEffect(() => {
    if (!product) return;
    const primaryIndex = product.primary_image_index ?? 0;
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      price: pricing?.price ?? product.base_price,
      image: product.images?.[primaryIndex] || product.images?.[0],
    });
    trackEvent("product_view", {
      workspaceSlug: wsSlug,
      productId: product.id,
      productName: product.name,
      price: pricing?.price ?? product.base_price,
      currency: product.currency,
    });
    // GA4 + Meta Pixel standard e-commerce event
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      price: pricing?.price ?? product.base_price,
      quantity: 1,
      currency: product.currency,
      item_brand: (product as any).brand || undefined,
      item_category: (product as any).category?.name || undefined,
      sku: product.sku || undefined,
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
    setCartAnimTrigger((c) => c + 1);
  };

  if (isResolving || isProductLoading) {
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

  // Smart Offer Page — new engine (backoffice-configurable via products.metadata.offer_page).
  const offerConfig = parseOfferPageConfig((product as any).metadata);
  if (offerConfig) {
    return <StoreSmartOfferPage config={offerConfig} product={product} workspaceSlug={wsSlug} />;
  }

  const images = product.images?.length ? product.images : [];
  const rawSpecs = product.specifications || {};
  const specs = filterValidSpecs(rawSpecs);
  const hasVideo = !!product.demo_video_url;
  const primaryIndex = product.primary_image_index ?? 0;
  const currentImage = images[selectedImage];

  return (
    <StoreVatProvider pricesIncludeVat={storeSettings?.prices_include_vat ?? true} vatRate={storeSettings?.vat_rate ?? 23} isB2B={tierPricing?.isB2B ?? false}>
    <>
      <ProductSeoHead
        product={product}
        storeName={storeName}
        wsSlug={wsSlug}
        pricing={pricing}
        reviewAvg={reviewAvg}
        reviewCount={reviewCount}
        images={images}
        primaryIndex={primaryIndex}
        isOutOfStock={isOutOfStock}
      />

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />
        <StoreProductViewTracker productId={product.id} workspaceId={(product as any).workspace_id} />
        <StoreVisitorTracker workspaceId={(product as any).workspace_id} currentPage={`/store/${wsSlug}/product/${product.id}`} productId={product.id} />

        {/* Sticky Add to Cart bar — hidden for price on request */}
        {!isPriceOnRequest && (
          <StoreStickyAddToCart
            name={product.name}
            price={pricing?.price ?? product.base_price}
            currency={product.currency}
            image={images[primaryIndex] || images[0]}
            isOutOfStock={isOutOfStock}
            onAddToCart={handleAddToCart}
            triggerRef={addToCartRef as React.RefObject<HTMLElement>}
          />
        )}

        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide"
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

          {/* 3-Zone Layout: Gallery | Info | Buy Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_320px] gap-6 lg:gap-8">
            {/* ZONE 1: Gallery with vertical thumbnails */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col lg:flex-row-reverse gap-3">
                {/* Main image */}
                <div className="flex-1">
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
                  {/* Counter */}
                  {images.length > 1 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {selectedImage + 1} de {images.length}
                    </p>
                  )}
                </div>

                {/* Thumbnails — vertical on lg, horizontal on mobile */}
                {(images.length > 1 || hasVideo) && (
                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[500px] pb-1 lg:pb-0 lg:pr-1">
                    {hasVideo && (
                      <button
                        onClick={() => { setShowVideo(true); }}
                        className={cn(
                          "h-16 w-16 lg:h-14 lg:w-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200 relative",
                          showVideo
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                        )}
                      >
                        {images[0] && <img src={images[0]} alt="" className="h-full w-full object-cover" loading="lazy" width={56} height={56} />}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="h-5 w-5 text-white fill-white" />
                        </div>
                      </button>
                    )}
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedImage(i); setShowVideo(false); }}
                        className={cn(
                          "h-16 w-16 lg:h-14 lg:w-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200",
                          !showVideo && selectedImage === i
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" width={56} height={56} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ZONE 2: Product Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-5"
            >
              <div>
                {product.category && (
                  <p className="text-sm font-semibold text-primary/70 uppercase tracking-widest mb-2">
                    {product.category}
                  </p>
                )}
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
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
                          <Star key={s} className={cn("h-4 w-4", s <= Math.round(reviewAvg) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
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

                {/* Recent viewers */}
                {recentViewers > 2 && (
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4 text-primary" />
                    <span>{recentViewers} pessoas viram este produto recentemente</span>
                  </div>
                )}
              </div>

              {/* Price — visible on mobile/tablet, hidden on lg (shown in Buy Box) */}
              {isPriceOnRequest ? (
                <div className="lg:hidden flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-primary">Preço sob consulta</span>
                </div>
              ) : (
                <div className="lg:hidden">
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-bold text-primary">
                       €{(pricing?.price ?? product.base_price).toFixed(2)}
                     </span>
                     <StoreVatLabel />
                    {pricing?.isDiscounted && !pricing?.isPromo && (
                      <span className="text-lg text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
                    )}
                    {pricing?.isPromo && pricing.lowestPrice30d && (
                      <span className="text-lg text-muted-foreground line-through">€{pricing.lowestPrice30d.toFixed(2)}</span>
                    )}
                    {pricing?.isPromo && (pricing.savingsPercent ?? 0) > 0 && (
                      <Badge className="bg-destructive/10 text-destructive border-0">-{pricing.savingsPercent}%</Badge>
                    )}
                    {product.billing_type === "recurring" && (
                      <span className="text-muted-foreground">/mês</span>
                    )}
                  </div>
                  {pricing?.isPromo && pricing.lowestPrice30d && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Preço mais baixo nos últimos 30 dias: €{pricing.lowestPrice30d.toFixed(2)}
                    </p>
                  )}
                  {pricing?.discountLabel && !pricing?.isPromo && (
                    <Badge variant="outline" className="mt-1" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
                      {pricing.discountLabel}
                    </Badge>
                  )}
                </div>
              )}

              {product.short_description && (
                <p className="text-muted-foreground leading-relaxed">
                  {product.short_description}
                </p>
              )}

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
              <StoreProductConditionBadge condition={(product as any).product_condition} compact={false} />

              {/* Loyalty Points */}
              <StoreLoyaltyWidget
                workspaceId={wsSlug}
                workspaceSlug={wsSlug}
                productPrice={pricing?.price ?? product.base_price}
              />

              <Separator />

              <StoreShareButtons
                url={getShareUrl("product", `${wsSlug}/${product.id}`)}
                title={product.name}
                description={product.short_description || undefined}
                image={images[primaryIndex] || images[0]}
              />
            </motion.div>

            {/* ZONE 3: Buy Box (sticky on desktop) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-2 lg:col-span-1"
            >
              <div className="@container lg:sticky lg:top-24 space-y-4 border rounded-2xl p-4 sm:p-5 bg-card shadow-sm">
                {/* Price in Buy Box (desktop only) */}
                {isPriceOnRequest ? (
                  <div className="hidden lg:flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    <span className="text-xl font-semibold text-primary">Preço sob consulta</span>
                  </div>
                ) : (
                  <div className="hidden lg:block">
                    <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-bold text-primary">
                         €{(pricing?.price ?? product.base_price).toFixed(2)}
                       </span>
                       <StoreVatLabel />
                      {pricing?.isDiscounted && !pricing?.isPromo && (
                        <span className="text-lg text-muted-foreground line-through">€{product.base_price.toFixed(2)}</span>
                      )}
                      {pricing?.isPromo && pricing.lowestPrice30d && (
                        <span className="text-lg text-muted-foreground line-through">€{pricing.lowestPrice30d.toFixed(2)}</span>
                      )}
                      {pricing?.isPromo && (pricing.savingsPercent ?? 0) > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border-0">-{pricing.savingsPercent}%</Badge>
                      )}
                      {product.billing_type === "recurring" && (
                        <span className="text-muted-foreground">/mês</span>
                      )}
                    </div>
                    {pricing?.isPromo && pricing.lowestPrice30d && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Preço mais baixo nos últimos 30 dias: €{pricing.lowestPrice30d.toFixed(2)}
                      </p>
                    )}
                    {pricing?.discountLabel && !pricing?.isPromo && (
                      <Badge variant="outline" className="mt-1" style={{ borderColor: tierPricing?.tier?.color || undefined, color: tierPricing?.tier?.color || undefined }}>
                        {pricing.discountLabel}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Urgency Countdown for time-limited offers */}
                {!isPriceOnRequest && pricing?.isDiscounted && ((product as any).offer_ends_at || pricing?.promoEndAt) && (
                  <StoreOfferCountdown endsAt={(product as any).offer_ends_at || pricing.promoEndAt} />
                )}

                {/* Stock status */}
                {!isPriceOnRequest && (
                  isOutOfStock ? (
                    <Badge variant="secondary">Esgotado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <Check className="h-3 w-3 mr-1" />
                      Em stock
                    </Badge>
                  )
                )}

                {/* Aviso único de decisão (stock baixo, fim de promoção ou vendas) */}
                {!isPriceOnRequest && pageConfig.decision_nudge_enabled && (
                  <StoreDecisionNudge
                    trackStock={product.track_stock}
                    stockQuantity={product.stock_quantity}
                    isOutOfStock={isOutOfStock}
                    promoEndsAt={(product as any).offer_ends_at || pricing?.promoEndAt || null}
                    soldLabel={soldLabel}
                  />
                )}



                {/* Delivery */}
                {!isPriceOnRequest && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-xl p-3">
                    <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Entrega estimada: <span className="font-semibold text-foreground">{getEstimatedDelivery()}</span>
                    </span>
                  </div>
                )}

                {/* Quantity + Add to Cart OR Price Request */}
                <div className="space-y-3">
                  {isPriceOnRequest ? (
                    <>
                      <StorePriceRequestDialog
                        productId={product.id}
                        productName={product.name}
                        workspaceId={(product as any).workspace_id}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => product && toggleWishlist.mutate({
                          productId: product.id,
                          workspaceId: (product as any).workspace_id,
                          isInWishlist,
                        })}
                      >
                        <Heart className={cn("h-4 w-4 transition-colors", isInWishlist && "fill-destructive text-destructive")} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Qtd:</span>
                        <div className="flex items-center border rounded-xl overflow-hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-none"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium text-sm">{quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-none"
                            onClick={() => setQuantity(quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl ml-auto"
                          onClick={() => product && toggleWishlist.mutate({
                            productId: product.id,
                            workspaceId: (product as any).workspace_id,
                            isInWishlist,
                          })}
                        >
                          <Heart className={cn("h-4 w-4 transition-colors", isInWishlist && "fill-destructive text-destructive")} />
                        </Button>
                      </div>

                      <StorePurchasePanel
                        productId={product.id}
                        productName={product.name}
                        workspaceId={(product as any).workspace_id}
                        workspaceSlug={wsSlug}
                        categoryId={product.store_category_id}
                        price={pricing?.price ?? product.base_price}
                        disabled={isOutOfStock}
                        onAddToCart={handleAddToCart}
                        config={pageConfig}
                        storeName={storeName}
                        contactEmail={storeSettings?.notification_email}
                        directBullets={[
                          `Entrega estimada: ${getEstimatedDelivery()}`,
                          pageConfig.trust_returns_text,
                          "Pagamento seguro",
                        ]}
                        currentProduct={{
                          id: product.id,
                          name: product.name,
                          base_price: pricing?.price ?? product.base_price,
                          currency: product.currency,
                          images: (product.images as string[] | null) ?? null,
                          primary_image_index: product.primary_image_index ?? 0,
                          sku: product.sku || null,
                          quantity: quantity,
                        }}
                        offerSlot={
                          <StoreOfferDialog
                            productId={product.id}
                            productName={product.name}
                            originalPrice={pricing?.price ?? product.base_price}
                            currency={product.currency}
                            workspaceId={(product as any).workspace_id}
                          />
                        }
                      />

                      <span ref={addToCartRef} aria-hidden="true" className="block h-0" />

                      <StoreQuickBuyButton
                        product={{
                          id: product.id,
                          name: product.name,
                          price: pricing?.price ?? product.base_price,
                          currency: product.currency,
                          image: images[primaryIndex] || images[0],
                          sku: product.sku || undefined,
                        }}
                        workspaceSlug={wsSlug}
                        disabled={isOutOfStock}
                        quantity={quantity}
                        className="w-full h-12 text-base"
                      />

                      <StoreProductAlertWidget
                        productId={product.id}
                        workspaceId={(product as any).workspace_id}
                        productName={product.name}
                        currentPrice={pricing?.price ?? product.base_price}
                        isOutOfStock={isOutOfStock}
                      />
                    </>
                  )}
                </div>


                {/* Trust signals — compact inline */}
                <Separator />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <span>Envio Grátis</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5 text-primary" />
                    <span>Devolução</span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span>Seguro</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Details Section — Vertical stack (Amazon pattern) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-8"
          >
            {/* 1. Highlights */}
            <StoreProductHighlights
              benefits={product.benefits}
              shortDescription={product.short_description}
              specs={specs}
            />

            {/* 2. Description with Read More */}
            {product.commercial_description && (
              <StoreProductDescription description={product.commercial_description} />
            )}

            {/* 3. Specifications — humanized */}
            {Object.keys(specs).length > 0 && (
              <StoreProductSpecs specs={specs} />
            )}

            {/* 4. Secções estruturadas publicadas (com âncoras) */}
            {pageConfig.sections_enabled && <StoreProductSections productId={product.id} />}

            {/* 5. Faixa de confiança */}
            {pageConfig.trust_enabled && (
              <StoreTrustStrip workspaceId={(product as any).workspace_id} config={pageConfig} />
            )}
          </motion.div>


          {/* Price Comparison & History */}
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="border rounded-xl p-5">
              <PriceComparisonWidget
                productId={product.id}
                productName={product.name}
                currentPrice={pricing?.price ?? product.base_price}
                category={product.category || undefined}
                workspaceId={(product as any).workspace_id}
                workspaceSlug={wsSlug}
                currency={product.currency}
              />
            </div>
            <div className="border rounded-xl p-5">
              <PriceHistoryChart
                productId={product.id}
                currentPrice={pricing?.price ?? product.base_price}
                currency={product.currency}
              />
            </div>
          </div>

          {/* Product Documents */}
          <StoreProductDocuments productId={product.id} />

          {/* Reviews */}
          <StoreReviewsSection productId={product.id} workspaceId={(product as any).workspace_id} />

          {/* Compatible Products */}
          <StoreCompatibleProducts
            productId={product.id}
            workspaceId={(product as any).workspace_id}
            workspaceSlug={wsSlug}
          />

          {/* Cross-sell */}
          <StoreBoughtTogether
            productId={product.id}
            categoryId={product.store_category_id}
            workspaceId={(product as any).workspace_id}
            currentPrice={pricing?.price ?? product.base_price}
            currency={product.currency}
          />

          {/* Packs e alternativas agora vivem no painel de decisão da buy box */}


          {/* Perguntas e respostas */}
          {pageConfig.qa_enabled && (
            <StoreProductQA
              productId={product.id}
              workspaceId={(product as any).workspace_id}
              allowQuestions={pageConfig.qa_allow_questions}
            />
          )}



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
          storeName={storeName}
          pricesIncludeVat={storeSettings?.prices_include_vat ?? true}
          vatRate={storeSettings?.vat_rate ?? 23}
        />

        {/* AI Advisor */}
        <StoreAIAdvisor
          workspaceId={(product as any).workspace_id}
          workspaceSlug={wsSlug}
          productContext={{ name: product.name, category: product.category || undefined }}
        />

        {/* Mobile Conversion Bar — hidden for price on request */}
        {!isPriceOnRequest && (
          <StoreMobileConversionBar
            product={{
              id: product.id,
              name: product.name,
              price: pricing?.price ?? product.base_price,
              currency: product.currency,
              image: images[primaryIndex] || images[0],
              sku: product.sku || undefined,
            }}
            workspaceSlug={wsSlug}
            isOutOfStock={isOutOfStock}
            triggerRef={addToCartRef as React.RefObject<HTMLElement>}
          />
        )}

        {/* Add to Cart Animation */}
        <StoreAddToCartAnimation trigger={cartAnimTrigger} />
        <StoreCookieConsent />
      </div>
    </>
    </StoreVatProvider>
  );
}
