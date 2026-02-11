import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreHeroCarousel } from "@/components/store/sections/StoreHeroCarousel";
import { StoreCategoryGrid } from "@/components/store/sections/StoreCategoryGrid";
import { StoreBestSellers } from "@/components/store/sections/StoreBestSellers";
import { StoreNewArrivals } from "@/components/store/sections/StoreNewArrivals";
import { StoreTrustSection } from "@/components/store/sections/StoreTrustSection";
import { StoreFeaturedSection } from "@/components/store/sections/StoreFeaturedSection";
import { StoreCTABanner } from "@/components/store/sections/StoreCTABanner";
import { StoreCouponBanner } from "@/components/store/sections/StoreCouponBanner";
import { StoreDealsSection } from "@/components/store/sections/StoreDealsSection";
import { StoreCategoryCarousel } from "@/components/store/sections/StoreCategoryCarousel";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreFaqSection } from "@/components/store/sections/StoreFaqSection";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreAIAdvisor } from "@/components/store/StoreAIAdvisor";
import { StoreFilterSidebar, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import { StoreCompareBar } from "@/components/store/StoreCompareBar";
import { StoreCompareModal } from "@/components/store/StoreCompareModal";
import { StoreCompareProvider } from "@/contexts/StoreCompareContext";
import { useStoreProducts, useStoreCategories, useInfiniteStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useBatchReviewStats, useProductSalesCount } from "@/hooks/useProductSalesCount";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";

export default function StorePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<StoreFilters>({});

  const { workspaceId: wsId, slug: wsSlug, isLoading: isResolving } = useResolveStoreWorkspace(workspaceSlug);

  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteStoreProducts({
    workspaceId: wsId,
    categoryId: filters.categoryId,
    search,
    sortBy: filters.sortBy,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  const allProducts = useMemo(
    () => infiniteData?.pages.flat() ?? [],
    [infiniteData]
  );

  // Client-side stock filter
  const products = useMemo(() => {
    if (!filters.inStock) return allProducts;
    return allProducts.filter(p => p.stock_status !== "out_of_stock");
  }, [allProducts, filters.inStock]);

  const sentinelRef = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const { data: featuredProducts = [] } = useStoreProducts({
    workspaceId: wsId,
    featured: true,
  });

  const { data: categories = [] } = useStoreCategories(wsId);
  const { data: tierPricing } = useStoreTierPricing(wsId);
  const { data: storeSettings } = usePublicStoreSettings(wsId);
  const { items: recentlyViewed } = useRecentlyViewed(wsId || "");
  const { data: reviewStats } = useBatchReviewStats(wsId);
  const { data: salesCounts } = useProductSalesCount(wsId);

  const storeName = storeSettings?.store_name || "Loja";
  const showHero = !search && !filters.categoryId && !filters.minPrice && !filters.maxPrice && !filters.inStock;
  const isFiltering = !!search || !!filters.categoryId || !!filters.minPrice || !!filters.maxPrice || !!filters.inStock;

  // "Deals" — featured products serve as deals for now
  const dealProducts = featuredProducts.filter(p => p.stock_status !== "out_of_stock");

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 500;
    return Math.ceil(Math.max(...allProducts.map(p => p.base_price)) / 10) * 10;
  }, [allProducts]);

  if (isResolving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StoreCompareProvider>
    <>
      <Helmet>
        <title>{storeName} | FastCRM</title>
        <meta name="description" content={storeSettings?.store_description || "Explore os nossos produtos e serviços"} />
        <link rel="canonical" href={`${window.location.origin}/store/${wsSlug}`} />
        <meta property="og:title" content={`${storeName} | FastCRM`} />
        <meta property="og:description" content={storeSettings?.store_description || "Explore os nossos produtos e serviços"} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${window.location.origin}/store/${wsSlug}`} />
        <meta property="og:site_name" content="FastCRM" />
        {(storeSettings?.banner_url || storeSettings?.logo_url) && (
          <meta property="og:image" content={storeSettings.banner_url || storeSettings.logo_url!} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            "name": storeName,
            "description": storeSettings?.store_description || "",
            "url": `${window.location.origin}/store/${wsSlug}`,
            ...(storeSettings?.logo_url ? { "logo": storeSettings.logo_url } : {}),
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Coupon Countdown Banner */}
        <StoreCouponBanner workspaceId={wsId} />

        <StoreHeader
          storeName={storeName}
          logoUrl={storeSettings?.logo_url || undefined}
          onSearch={setSearch}
          workspaceSlug={wsSlug}
          categories={categories}
          onSelectCategory={(id) => setFilters(f => ({ ...f, categoryId: id }))}
          products={allProducts}
        />
        <StoreCartDrawer workspaceSlug={wsSlug} />

        {/* Category Carousel */}
        {categories.length > 0 && showHero && (
          <StoreCategoryCarousel
            categories={categories}
            selectedCategoryId={filters.categoryId}
            onSelectCategory={(id) => setFilters(f => ({ ...f, categoryId: id }))}
          />
        )}

        {/* Hero Carousel */}
        {showHero && (
          <StoreHeroCarousel
            products={featuredProducts}
            workspaceSlug={wsSlug}
            storeName={storeName}
            storeDescription={storeSettings?.store_description}
            bannerUrl={storeSettings?.banner_url}
          />
        )}

        {showHero && <StoreTrustSection />}

        {/* Category Grid — Quad Cards */}
        {showHero && categories.length > 0 && (
          <StoreCategoryGrid
            categories={categories}
            onSelectCategory={(id) => {
              setFilters(f => ({ ...f, categoryId: id }));
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}

        {/* Best Sellers */}
        {showHero && salesCounts && salesCounts.size > 0 && (
          <StoreBestSellers
            products={allProducts}
            salesCounts={salesCounts}
            workspaceSlug={wsSlug}
          />
        )}

        {/* New Arrivals */}
        {showHero && allProducts.length > 0 && (
          <StoreNewArrivals
            products={allProducts}
            workspaceSlug={wsSlug}
          />
        )}

        {/* Deals section */}
        {showHero && dealProducts.length > 0 && (
          <StoreDealsSection
            products={dealProducts}
            workspaceSlug={wsSlug}
            tierPricing={tierPricing}
          />
        )}

        {showHero && featuredProducts.length > 0 && (
          <StoreFeaturedSection
            products={featuredProducts}
            workspaceSlug={wsSlug}
            tierPricing={tierPricing}
          />
        )}

        {showHero && <StoreCTABanner />}

        {/* Products Section with Sidebar Filters */}
        <section id="products-section" className="container mx-auto px-4 py-8 md:py-12">
          {search && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground mb-6"
            >
              Resultados para "<span className="font-medium text-foreground">{search}</span>"
              {products.length > 0 && ` — ${products.length} produto${products.length !== 1 ? "s" : ""}`}
            </motion.p>
          )}

          <div className="flex gap-8">
            {/* Filter Sidebar */}
            {(categories.length > 0 || allProducts.length > 0) && (
              <StoreFilterSidebar
                categories={categories}
                filters={filters}
                onFiltersChange={setFilters}
                totalProducts={products.length}
                maxProductPrice={maxPrice}
              />
            )}

            {/* Product Grid */}
            <div className="flex-1 min-w-0">
              {/* Mobile sort bar */}
              <div className="flex items-center justify-between mb-6 lg:hidden">
                <span className="text-sm text-muted-foreground">
                  {products.length} produto{products.length !== 1 ? "s" : ""}
                </span>
              </div>

              {!isFiltering && !showHero && null}

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-square w-full rounded-2xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Sem produtos disponíveis</h2>
                  <p className="text-muted-foreground">
                    {search
                      ? "Nenhum produto encontrado para esta pesquisa."
                      : isFiltering
                      ? "Nenhum produto corresponde aos filtros selecionados."
                      : "A loja ainda não tem produtos publicados."}
                  </p>
                </motion.div>
              ) : (
                <>
                  {!isFiltering && (
                    <h2 className="text-2xl font-bold text-foreground mb-6">Todo o Catálogo</h2>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {products.map((product, index) => (
                      <StoreProductCard
                        key={product.id}
                        product={product}
                        workspaceSlug={wsSlug}
                        tierPricing={tierPricing}
                        index={index}
                        reviewStats={reviewStats}
                        salesCounts={salesCounts}
                      />
                    ))}
                  </div>

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="h-1" />

                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">A carregar mais...</span>
                    </div>
                  )}

                  {hasNextPage && !isFetchingNextPage && (
                    <div className="flex justify-center py-6">
                      <Button variant="outline" onClick={() => fetchNextPage()}>
                        Carregar Mais
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <StoreRecentlyViewed
              items={recentlyViewed}
              workspaceSlug={wsSlug}
            />
          )}
        </section>

        {/* FAQ Section */}
        <StoreFaqSection workspaceId={wsId} />

        {/* Footer */}
        <StoreFooter
          workspaceSlug={wsSlug}
          storeName={storeName}
          categories={categories}
          footerText={storeSettings?.footer_text}
        />

        {/* AI Advisor - need workspaceId from products */}
        {allProducts.length > 0 && (
          <StoreAIAdvisor
            workspaceId={(allProducts[0] as any).workspace_id}
            workspaceSlug={wsSlug}
          />
        )}
        {/* Compare Bar & Modal */}
        <StoreCompareBar />
        <StoreCompareModal
          workspaceSlug={wsSlug}
          tierPricing={tierPricing}
          reviewStats={reviewStats}
        />
      </div>
    </>
    </StoreCompareProvider>
  );
}
