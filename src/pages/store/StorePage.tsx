import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreCouponBanner } from "@/components/store/sections/StoreCouponBanner";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreAIAdvisor } from "@/components/store/StoreAIAdvisor";
import { StoreVisitorTracker } from "@/components/store/StoreVisitorTracker";
import { StoreCompareBar } from "@/components/store/StoreCompareBar";
import { StoreCompareModal } from "@/components/store/StoreCompareModal";
import { StoreCompareProvider } from "@/contexts/StoreCompareContext";
import { StoreVatProvider } from "@/contexts/StoreVatContext";
import type { StoreFilters } from "@/components/store/StoreFilterSidebar";
import { StoreSeoHead } from "@/components/store/storefront/StoreSeoHead";
import { StoreHeroSections } from "@/components/store/storefront/StoreHeroSections";
import { StoreCatalogSection } from "@/components/store/storefront/StoreCatalogSection";
import { useStoreProducts, useStoreCategories, useInfiniteStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useBatchReviewStats, useProductSalesCount } from "@/hooks/useProductSalesCount";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { useC2CStorefrontProducts } from "@/hooks/useC2CStorefrontProducts";
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
    sortBy: filters.sortBy,
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

  // Client-side stock filter
  const products = useMemo(() => {
    if (!filters.inStock) return allProducts;
    return allProducts.filter((p: any) => p.stock_status !== "out_of_stock");
  }, [allProducts, filters.inStock]);

  const storeName = storeSettings?.store_name || "Loja";
  const showHero = !search && !filters.categoryId && !filters.minPrice && !filters.maxPrice && !filters.inStock;
  const isFiltering = !!search || !!filters.categoryId || !!filters.minPrice || !!filters.maxPrice || !!filters.inStock;
  const dealProducts = featuredProducts.filter((p) => p.stock_status !== "out_of_stock");

  if (isResolving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StoreVatProvider pricesIncludeVat={storeSettings?.prices_include_vat ?? true} vatRate={storeSettings?.vat_rate ?? 23}>
      <StoreCompareProvider>
        <>
          <StoreSeoHead storeName={storeName} wsSlug={wsSlug} storeSettings={storeSettings} />

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
          </div>
        </>
      </StoreCompareProvider>
    </StoreVatProvider>
  );
}
