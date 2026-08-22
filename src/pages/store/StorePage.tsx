import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreCouponBanner } from "@/components/store/sections/StoreCouponBanner";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreCookieConsent } from "@/components/store/StoreCookieConsent";
import { StoreAIAdvisor } from "@/components/store/StoreAIAdvisor";
import { StoreVisitorTracker } from "@/components/store/StoreVisitorTracker";
import { StoreCompareBar } from "@/components/store/StoreCompareBar";
import { StoreCompareModal } from "@/components/store/StoreCompareModal";
import { StoreCompareProvider } from "@/contexts/StoreCompareContext";
import { StoreVatProvider } from "@/contexts/StoreVatContext";
import { countActiveFilters, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import {
  applyClientFilters,
  applyClientSort,
  getBrandFacets,
  isServerSort,
} from "@/lib/store/catalogClientFilters";

import { StoreSeoHead } from "@/components/store/storefront/StoreSeoHead";
import { StoreHeroSections } from "@/components/store/storefront/StoreHeroSections";
import { StoreCatalogSection } from "@/components/store/storefront/StoreCatalogSection";
import { StoreLiveSalesNotification } from "@/components/store/StoreLiveSalesNotification";
import { StoreExitIntentPopup } from "@/components/store/StoreExitIntentPopup";
import { StorePersonalizedSection } from "@/components/store/StorePersonalizedSection";
import { useStoreProducts, useStoreCategories, useInfiniteStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useBatchReviewStats, useProductSalesCount } from "@/hooks/useProductSalesCount";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { useC2CStorefrontProducts } from "@/hooks/useC2CStorefrontProducts";
import { StoreShareButtons } from "@/components/store/StoreShareButtons";
import { getShareUrl } from "@/utils/getShareUrl";
import { Loader2 } from "lucide-react";

export default function StorePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<StoreFilters>({});

  const { workspaceId: wsId, slug: wsSlug, isLoading: isResolving } = useResolveStoreWorkspace(workspaceSlug);

  const {
    data: infiniteData, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage,
  } = useInfiniteStoreProducts({
    workspaceId: wsId,
    categoryId: filters.categoryId,
    search,
    sortBy: isServerSort(filters.sortBy) ? filters.sortBy : undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  const allStoreProducts = useMemo(() => infiniteData?.pages.flat() ?? [], [infiniteData]);

  const sentinelRef = useInfiniteScroll({ hasNextPage: !!hasNextPage, isFetchingNextPage, fetchNextPage });

  const { data: featuredProducts = [] } = useStoreProducts({ workspaceId: wsId, featured: true });
  const { data: categories = [] } = useStoreCategories(wsId);
  const { data: tierPricing } = useStoreTierPricing(wsId);
  const { data: storeSettings } = usePublicStoreSettings(wsId);
  const { items: recentlyViewed } = useRecentlyViewed(wsId || "");
  const { data: reviewStats } = useBatchReviewStats(wsId);
  const { data: salesCounts } = useProductSalesCount(wsId);

  // C2C
  const c2cEnabled = storeSettings?.c2c_enabled ?? false;
  const mappedC2CProducts = useC2CStorefrontProducts(wsId, c2cEnabled);

  const allProducts = useMemo(() => [...allStoreProducts, ...mappedC2CProducts] as any[], [allStoreProducts, mappedC2CProducts]);

  const brandFacets = useMemo(() => getBrandFacets(allProducts), [allProducts]);

  // Filtros e ordenações não cobertos pela consulta ao servidor
  const products = useMemo(() => {
    const ctx = { reviewStats, salesCounts };
    return applyClientSort(applyClientFilters(allProducts, filters, ctx), filters.sortBy, ctx);
  }, [allProducts, filters, reviewStats, salesCounts]);

  const storeName = storeSettings?.store_name || "Loja";
  const activeFilterCount = countActiveFilters(filters);
  const showHero = !search && activeFilterCount === 0;
  const isFiltering = !!search || activeFilterCount > 0;
  const dealProducts = featuredProducts.filter((p) => p.stock_status !== "out_of_stock");


  if (isResolving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StoreVatProvider pricesIncludeVat={storeSettings?.prices_include_vat ?? true} vatRate={storeSettings?.vat_rate ?? 23} isB2B={tierPricing?.isB2B ?? false}>
      <StoreCompareProvider>
        <>
          <StoreSeoHead storeName={storeName} wsSlug={wsSlug} storeSettings={storeSettings} products={allProducts} />

          <div className="min-h-screen bg-background">
            <StoreVisitorTracker workspaceId={wsId} currentPage={`/store/${wsSlug}`} />
            <StoreCouponBanner workspaceId={wsId} />

            <StoreHeader
              storeName={storeName}
              logoUrl={storeSettings?.logo_url || undefined}
              onSearch={setSearch}
              workspaceSlug={wsSlug}
              categories={categories}
              onSelectCategory={(id) => setFilters((f) => ({ ...f, categoryId: id }))}
              products={allProducts}
            />
            <StoreCartDrawer workspaceSlug={wsSlug} />

            {showHero && (
              <StoreHeroSections
                categories={categories}
                featuredProducts={featuredProducts}
                dealProducts={dealProducts}
                allProducts={allProducts}
                salesCounts={salesCounts}
                tierPricing={tierPricing}
                wsSlug={wsSlug}
                storeName={storeName}
                storeDescription={storeSettings?.store_description}
                bannerUrl={storeSettings?.banner_url}
                filters={filters}
                onFilterChange={setFilters}
              />
            )}

            <StoreCatalogSection
              products={products}
              allProducts={allProducts}
              categories={categories}
              filters={filters}
              onFiltersChange={setFilters}
              search={search}
              onClearSearch={() => setSearch("")}
              storeName={storeName}
              brandFacets={brandFacets}

              isLoading={isLoading}
              isFiltering={isFiltering}
              showHero={showHero}
              wsSlug={wsSlug}
              wsId={wsId}
              tierPricing={tierPricing}
              reviewStats={reviewStats}
              salesCounts={salesCounts}
              recentlyViewed={recentlyViewed}
              sentinelRef={sentinelRef}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />

            {/* Personalized Recommendations */}
            {showHero && recentlyViewed.length > 0 && (
              <div className="container mx-auto px-4">
                <StorePersonalizedSection
                  recentlyViewed={recentlyViewed}
                  allProducts={allProducts}
                  workspaceSlug={wsSlug}
                  workspaceId={wsId}
                  tierPricing={tierPricing}
                  reviewStats={reviewStats}
                  salesCounts={salesCounts}
                />
              </div>
            )}

            {/* Share Buttons */}
            <div className="container mx-auto px-4 py-4 flex justify-end">
              <StoreShareButtons
                url={getShareUrl("store", wsSlug)}
                title={storeName}
                description={storeSettings?.store_description || undefined}
                image={storeSettings?.banner_url || storeSettings?.logo_url || undefined}
              />
            </div>

            <StoreFooter
              workspaceSlug={wsSlug}
              storeName={storeName}
              categories={categories}
              footerText={storeSettings?.footer_text}
              pricesIncludeVat={storeSettings?.prices_include_vat ?? true}
              vatRate={storeSettings?.vat_rate ?? 23}
            />

            {allProducts.length > 0 && (
              <StoreAIAdvisor
                workspaceId={(allProducts[0] as any).workspace_id}
                workspaceSlug={wsSlug}
              />
            )}
            <StoreCompareBar />
            <StoreCompareModal workspaceSlug={wsSlug} tierPricing={tierPricing} reviewStats={reviewStats} />

            {/* FOMO Notifications */}
            {wsId && allProducts.length > 0 && (
              <StoreLiveSalesNotification workspaceId={wsId} products={allProducts} />
            )}

            {/* Exit Intent Popup */}
            <StoreExitIntentPopup workspaceSlug={wsSlug} />
            <StoreCookieConsent />
          </div>
        </>
      </StoreCompareProvider>
    </StoreVatProvider>
  );
}
