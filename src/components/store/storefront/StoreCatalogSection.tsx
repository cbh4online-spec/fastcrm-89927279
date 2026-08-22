import { useMemo, useState } from "react";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreFilterSidebar, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreFaqSection } from "@/components/store/sections/StoreFaqSection";
import { StoreTrustStrip } from "@/components/store/StoreTrustStrip";
import { StoreCatalogToolbar, type CatalogDensity, type CatalogViewMode } from "./StoreCatalogToolbar";
import { StoreActiveFilterChips } from "./StoreActiveFilterChips";
import { StoreCatalogBreadcrumbs } from "./StoreCatalogBreadcrumbs";
import { StoreCatalogEmptyState } from "./StoreCatalogEmptyState";
import { StoreProductListRow } from "./StoreProductListRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreCatalogSectionProps {
  products: any[];
  allProducts: any[];
  categories: any[];
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  search: string;
  onClearSearch?: () => void;
  isLoading: boolean;
  isFiltering: boolean;
  showHero: boolean;
  wsSlug: string;
  wsId: string;
  storeName?: string;
  brandFacets?: { value: string; count: number }[];
  tierPricing: any;
  reviewStats: any;
  salesCounts: any;
  recentlyViewed: any[];
  sentinelRef: React.RefObject<HTMLDivElement>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function StoreCatalogSection({
  products,
  allProducts,
  categories,
  filters,
  onFiltersChange,
  search,
  onClearSearch,
  isLoading,
  isFiltering,
  showHero,
  wsSlug,
  wsId,
  storeName,
  brandFacets = [],
  tierPricing,
  reviewStats,
  salesCounts,
  recentlyViewed,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: StoreCatalogSectionProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>("grid");
  const [density, setDensity] = useState<CatalogDensity>("comfortable");

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 500;
    return Math.ceil(Math.max(...allProducts.map((p) => p.base_price || 0)) / 10) * 10;
  }, [allProducts]);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === filters.categoryId)?.name || null,
    [categories, filters.categoryId],
  );

  const gridClass =
    density === "compact"
      ? "grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
      : "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6";

  return (
    <>
      <section id="products-section" className="container mx-auto px-4 py-8 md:py-12">
        <StoreCatalogBreadcrumbs
          wsSlug={wsSlug}
          storeName={storeName}
          categoryName={categoryName}
          search={search || undefined}
        />

        <div className="flex gap-8">
          {/* Sidebar de filtros */}
          {(categories.length > 0 || allProducts.length > 0) && (
            <StoreFilterSidebar
              categories={categories}
              filters={filters}
              onFiltersChange={onFiltersChange}
              totalProducts={products.length}
              maxProductPrice={maxPrice}
              brandFacets={brandFacets}
            />
          )}

          <div className="flex-1 min-w-0">
            <StoreCatalogToolbar
              total={products.length}
              filters={filters}
              onFiltersChange={onFiltersChange}
              categories={categories}
              brandFacets={brandFacets}
              maxProductPrice={maxPrice}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              density={density}
              onDensityChange={setDensity}
            />

            <StoreActiveFilterChips
              filters={filters}
              categories={categories}
              onFiltersChange={onFiltersChange}
              search={search || undefined}
              onClearSearch={onClearSearch}
            />

            {isLoading ? (
              <div className={gridClass}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <StoreCatalogEmptyState
                search={search || undefined}
                isFiltering={isFiltering}
                onClearFilters={() => onFiltersChange({ sortBy: filters.sortBy })}
                onClearSearch={onClearSearch}
                suggestions={allProducts}
                wsSlug={wsSlug}
                tierPricing={tierPricing}
              />
            ) : (
              <>
                {!isFiltering && (
                  <h2 className="text-2xl font-bold text-foreground mb-6">Todo o Catálogo</h2>
                )}

                <div className={cn(viewMode === "list" ? "flex flex-col gap-3" : gridClass)}>
                  {products.map((product, index) =>
                    viewMode === "list" ? (
                      <StoreProductListRow
                        key={product.id}
                        product={product}
                        workspaceSlug={wsSlug}
                        tierPricing={tierPricing}
                        reviewStats={reviewStats}
                        salesCounts={salesCounts}
                        index={index}
                      />
                    ) : (
                      <StoreProductCard
                        key={product.id}
                        product={product}
                        workspaceSlug={wsSlug}
                        tierPricing={tierPricing}
                        index={index}
                        reviewStats={reviewStats}
                        salesCounts={salesCounts}
                      />
                    ),
                  )}
                </div>

                {/* Sentinela de scroll infinito */}
                <div ref={sentinelRef} className="h-1" />

                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">A carregar mais...</span>
                  </div>
                )}

                {hasNextPage && !isFetchingNextPage && (
                  <div className="flex justify-center py-6">
                    <Button variant="outline" className="rounded-full" onClick={() => fetchNextPage()}>
                      Carregar mais
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sinais de confiança */}
        <div className="mt-10">
          <StoreTrustStrip workspaceId={wsId} />
        </div>

        {/* Vistos recentemente */}
        {recentlyViewed.length > 0 && (
          <StoreRecentlyViewed items={recentlyViewed} workspaceSlug={wsSlug} />
        )}
      </section>

      <StoreFaqSection workspaceId={wsId} />
    </>
  );
}
