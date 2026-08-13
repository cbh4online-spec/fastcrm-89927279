import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, Package } from "lucide-react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreCookieConsent } from "@/components/store/StoreCookieConsent";
import { StoreProductViewTracker } from "@/components/store/StoreProductViewTracker";
import { StoreVatProvider } from "@/contexts/StoreVatContext";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { StorePriceRequestDialog } from "@/components/store/StorePriceRequestDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreTierPricing, getStorePrice } from "@/hooks/useStoreTierPricing";
import { useStoreReviewStats } from "@/hooks/useStoreReviewsWishlist";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { usePublicProductVariants } from "@/hooks/useProductVariants";
import { trackViewItem } from "@/lib/ecommerceTracking";
import { trackEvent } from "@/lib/analytics";
import { OfferProductGallery } from "./OfferProductGallery";
import { OfferDecisionPanel, type OfferSelectionState } from "./OfferDecisionPanel";
import { OfferTrustBadges } from "./OfferTrustBadges";
import { OfferStickyCTA } from "./OfferStickyCTA";
import { OfferSections } from "./OfferSections";
import { useOfferConversion } from "./useOfferConversion";
import { CONVERSION_GOAL_LABELS, type OfferPageConfig } from "./offerPageTypes";

interface Props {
  config: OfferPageConfig;
  product: any;
  workspaceSlug: string;
}

export function StoreSmartOfferPage({ config, product, workspaceSlug }: Props) {
  const { data: tierPricing } = useStoreTierPricing(product?.workspace_id);
  const { data: storeSettings } = usePublicStoreSettings(product?.workspace_id || "");
  const { average: reviewAvg, count: reviewCount } = useStoreReviewStats(product?.id);
  const { data: variants = [] } = usePublicProductVariants(product?.id);

  const [selection, setSelection] = useState<OfferSelectionState>({
    quantity: 1,
    mode: "one_time",
    sectorSelections: {},
  });

  // Base pricing + variant override
  const basePricing = product
    ? getStorePrice(product.base_price, product.id, tierPricing, product)
    : null;
  const selectedVariant = variants.find((v) => v.id === selection.variantId);
  const unitPrice = selectedVariant?.price_override ?? basePricing?.price ?? product?.base_price ?? 0;
  const totalPrice = unitPrice * selection.quantity;
  const isOutOfStock = product?.stock_status === "out_of_stock";
  const isPriceOnRequest = !!product?.price_on_request;

  const conversion = useOfferConversion({
    config,
    product,
    workspaceSlug,
    price: unitPrice,
    quantity: selection.quantity,
    variantId: selection.variantId,
    selection: selection.sectorSelections,
  });

  // Track offer view
  useEffect(() => {
    if (!product) return;
    trackEvent("smart_offer_view", {
      workspaceSlug,
      productId: product.id,
      preset: config.preset,
      conversionGoal: config.conversionGoal,
    });
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      price: unitPrice,
      quantity: 1,
      currency: product.currency,
      sku: product.sku || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const headline = config.headline || product.name;
  const subheadline = config.subheadline || product.short_description || "";
  const ctaLabel = config.ctaLabel || CONVERSION_GOAL_LABELS[config.conversionGoal];
  const promoLabel = config.promoLabel || product.promo_label;
  const primaryIndex = product.primary_image_index ?? 0;
  const images = product.images?.length
    ? [
        product.images[primaryIndex] || product.images[0],
        ...product.images.filter((_: string, i: number) => i !== primaryIndex),
      ]
    : [];

  const compareAt =
    product.compare_at_price && product.compare_at_price > unitPrice
      ? product.compare_at_price
      : null;
  const savings = compareAt ? (compareAt - unitPrice) * selection.quantity : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: product.currency || "EUR" }).format(v);

  const disableCTA =
    !isPriceOnRequest &&
    (config.conversionGoal === "add_to_cart" || config.conversionGoal === "buy_now") &&
    isOutOfStock;

  return (
    <StoreVatProvider
      pricesIncludeVat={storeSettings?.prices_include_vat ?? true}
      vatRate={storeSettings?.vat_rate ?? 23}
      isB2B={tierPricing?.isB2B ?? false}
    >
      {product && <StoreProductViewTracker productId={product.id} workspaceId={product.workspace_id} />}
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={workspaceSlug} />

        <div className="container mx-auto px-4 py-6">
          <Link
            to={`/store/${workspaceSlug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à loja
          </Link>
        </div>

        <div className="container mx-auto px-4 pb-12">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left column — gallery + content */}
            <div className="lg:col-span-7">
              <OfferProductGallery
                images={images}
                videoUrl={product.demo_video_url}
                productName={product.name}
                promoLabel={promoLabel}
              />

              {config.trustBadges.length > 0 && (
                <div className="mt-4">
                  <OfferTrustBadges badges={config.trustBadges} />
                </div>
              )}

              <div className="mt-6 lg:hidden">
                <MobileHeader
                  headline={headline}
                  subheadline={subheadline}
                  reviewAvg={reviewAvg}
                  reviewCount={reviewCount}
                />
              </div>

              <OfferSections config={config} product={product} workspaceSlug={workspaceSlug} />
            </div>

            {/* Right column — sticky commercial panel (desktop only) */}
            <aside className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-24 space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
                <DesktopHeader
                  headline={headline}
                  subheadline={subheadline}
                  reviewAvg={reviewAvg}
                  reviewCount={reviewCount}
                />

                <div>
                  <PriceBlock
                    unitPrice={unitPrice}
                    compareAt={compareAt}
                    quantity={selection.quantity}
                    total={totalPrice}
                    priceOnRequest={isPriceOnRequest}
                    formatCurrency={formatCurrency}
                    savings={savings}
                    savingsText={config.savingsText}
                  />
                </div>

                <OfferDecisionPanel
                  config={config}
                  product={product}
                  selection={selection}
                  onChange={setSelection}
                />

                <Button
                  size="lg"
                  className="w-full rounded-xl text-base font-semibold"
                  onClick={conversion.execute}
                  disabled={disableCTA}
                >
                  {isOutOfStock && !conversion.requiresQuoteDialog ? "Esgotado" : ctaLabel}
                </Button>


                {config.secondaryCtaLabel && (
                  <p className="text-center text-xs text-muted-foreground">
                    {config.secondaryCtaLabel}
                  </p>
                )}

                {config.deliveryText && (
                  <p className="text-xs text-muted-foreground">{config.deliveryText}</p>
                )}
              </div>
            </aside>

            {/* Mobile commercial panel (rendered inline between gallery/sections) */}
            <div className="lg:hidden">
              <div className="space-y-5 rounded-2xl border bg-card p-4">
                <PriceBlock
                  unitPrice={unitPrice}
                  compareAt={compareAt}
                  quantity={selection.quantity}
                  total={totalPrice}
                  priceOnRequest={isPriceOnRequest}
                  formatCurrency={formatCurrency}
                  savings={savings}
                  savingsText={config.savingsText}
                />
                <OfferDecisionPanel
                  config={config}
                  product={product}
                  selection={selection}
                  onChange={setSelection}
                />
              </div>
            </div>
          </div>
        </div>

        <StoreFooter workspaceSlug={workspaceSlug} storeName={storeSettings?.store_name} />
        <StoreCartDrawer workspaceSlug={workspaceSlug} />
        <StoreCookieConsent />

        {/* Mobile sticky CTA */}
        <OfferStickyCTA
          price={totalPrice}
          currency={product.currency || "EUR"}
          ctaLabel={isOutOfStock && !conversion.requiresQuoteDialog ? "Esgotado" : ctaLabel}
          onClick={conversion.execute}
          disabled={disableCTA}
          priceOnRequest={isPriceOnRequest}
        />

        <OfferConversionDialog
          open={conversion.quoteDialogOpen}
          onOpenChange={conversion.setQuoteDialogOpen}
          goal={conversion.goal}
          productId={product.id}
          productName={product.name}
          workspaceId={product.workspace_id}
          quantity={selection.quantity}
          sectorConfig={config.sectorConfig}
          preset={config.preset}
        />

      </div>
    </StoreVatProvider>
  );
}

function DesktopHeader({
  headline,
  subheadline,
  reviewAvg,
  reviewCount,
}: {
  headline: string;
  subheadline: string;
  reviewAvg: number;
  reviewCount: number;
}) {
  return (
    <div className="space-y-2">
      {reviewCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm">
          <div className="flex items-center gap-0.5" aria-label={`${reviewAvg} de 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={
                  s <= Math.round(reviewAvg)
                    ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    : "h-3.5 w-3.5 text-muted-foreground/40"
                }
              />
            ))}
          </div>
          <span className="text-muted-foreground">
            {reviewAvg.toFixed(1)} · {reviewCount} avaliações
          </span>
        </div>
      )}
      <h1 className="text-2xl font-bold leading-tight">{headline}</h1>
      {subheadline && <p className="text-sm text-muted-foreground">{subheadline}</p>}
    </div>
  );
}

function MobileHeader({
  headline,
  subheadline,
  reviewAvg,
  reviewCount,
}: {
  headline: string;
  subheadline: string;
  reviewAvg: number;
  reviewCount: number;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold leading-tight">{headline}</h1>
      {subheadline && <p className="text-sm text-muted-foreground">{subheadline}</p>}
      {reviewCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={
                  s <= Math.round(reviewAvg)
                    ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    : "h-3.5 w-3.5 text-muted-foreground/40"
                }
              />
            ))}
          </div>
          <span className="text-muted-foreground">
            {reviewAvg.toFixed(1)} · {reviewCount}
          </span>
        </div>
      )}
    </div>
  );
}

function PriceBlock({
  unitPrice,
  compareAt,
  quantity,
  total,
  priceOnRequest,
  formatCurrency,
  savings,
  savingsText,
}: {
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  total: number;
  priceOnRequest: boolean;
  formatCurrency: (v: number) => string;
  savings: number;
  savingsText?: string;
}) {
  if (priceOnRequest) {
    return (
      <div>
        <p className="text-2xl font-bold">Preço sob consulta</p>
        <p className="text-xs text-muted-foreground">
          Solicite um orçamento personalizado para esta solução.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{formatCurrency(unitPrice)}</span>
        {compareAt && (
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(compareAt)}
          </span>
        )}
      </div>
      <StoreVatLabel className="text-[11px]" />
      {quantity > 1 && (
        <p className="text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span> · {quantity}{" "}
          × {formatCurrency(unitPrice)}
        </p>
      )}
      {savings > 0 && (
        <Badge variant="secondary" className="text-[11px]">
          {savingsText || `Poupa ${formatCurrency(savings)}`}
        </Badge>
      )}
    </div>
  );
}

export default StoreSmartOfferPage;
