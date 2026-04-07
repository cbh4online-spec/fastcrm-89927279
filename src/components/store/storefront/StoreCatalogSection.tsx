import { useMemo } from "react";
import { motion } from "framer-motion";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreFilterSidebar, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import { StoreRecentlyViewed } from "@/components/store/sections/StoreRecentlyViewed";
import { StoreFaqSection } from "@/components/store/sections/StoreFaqSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, SlidersHorizontal } from "lucide-react";

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
            {/* Mobile filter + sort bar */}
            <div className="flex items-center justify-between gap-2 mb-4 lg:hidden">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filtros
                      {(() => {
                        const count = [filters.categoryId, filters.minPrice, filters.maxPrice, filters.inStock, filters.condition].filter(Boolean).length;
                        return count > 0 ? (
                          <Badge className="h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9px]">
                            {count}
                          </Badge>
                        ) : null;
                      })()}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filtros
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <StoreFilterSidebar
                        categories={categories}
                        filters={filters}
                        onFiltersChange={onFiltersChange}
                        totalProducts={products.length}
                        maxProductPrice={maxPrice}
                        renderMode="content-only"
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {products.length} produto{products.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Select
                value={filters.sortBy || "default"}
                onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v === "default" ? undefined : v as StoreFilters["sortBy"] })}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Recomendados</SelectItem>
                  <SelectItem value="price_asc">Preço: menor</SelectItem>
                  <SelectItem value="price_desc">Preço: maior</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
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
