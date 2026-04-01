import { useMemo } from "react";
import { motion } from "framer-motion";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreFilterSidebar, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreFaqSection } from "@/components/store/sections/StoreFaqSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Package } from "lucide-react";

interface StoreCatalogSectionProps {
  products: any[];
  allProducts: any[];
  categories: any[];
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  search: string;
  isLoading: boolean;
  isFiltering: boolean;
  showHero: boolean;
  wsSlug: string;
  wsId: string;
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
  isLoading,
  isFiltering,
  showHero,
  wsSlug,
  wsId,
  tierPricing,
  reviewStats,
  salesCounts,
  recentlyViewed,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: StoreCatalogSectionProps) {
  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 500;
    return Math.ceil(Math.max(...allProducts.map((p) => p.base_price)) / 10) * 10;
  }, [allProducts]);

  return (
    <>
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
              onFiltersChange={onFiltersChange}
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
          <StoreRecentlyViewed items={recentlyViewed} workspaceSlug={wsSlug} />
        )}
      </section>

      {/* FAQ Section */}
      <StoreFaqSection workspaceId={wsId} />
    </>
  );
}
