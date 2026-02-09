import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreHeroSection } from "@/components/store/sections/StoreHeroSection";
import { StoreTrustSection } from "@/components/store/sections/StoreTrustSection";
import { StoreFeaturedSection } from "@/components/store/sections/StoreFeaturedSection";
import { StoreCTABanner } from "@/components/store/sections/StoreCTABanner";
import { StoreFilterSidebar, type StoreFilters } from "@/components/store/StoreFilterSidebar";
import { useStoreProducts, useStoreCategories } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export default function StorePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<StoreFilters>({});

  const wsId = workspaceSlug || "";

  const { data: allProducts = [], isLoading } = useStoreProducts({
    workspaceId: wsId,
    categoryId: filters.categoryId,
    search,
    sortBy: filters.sortBy,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  // Client-side stock filter
  const products = useMemo(() => {
    if (!filters.inStock) return allProducts;
    return allProducts.filter(p => p.stock_status !== "out_of_stock");
  }, [allProducts, filters.inStock]);

  const { data: featuredProducts = [] } = useStoreProducts({
    workspaceId: wsId,
    featured: true,
  });

  const { data: categories = [] } = useStoreCategories(wsId);
  const { data: tierPricing } = useStoreTierPricing(wsId);
  const { data: storeSettings } = usePublicStoreSettings(wsId);

  const storeName = storeSettings?.store_name || "Loja";
  const showHero = !search && !filters.categoryId && !filters.minPrice && !filters.maxPrice && !filters.inStock;
  const isFiltering = !!search || !!filters.categoryId || !!filters.minPrice || !!filters.maxPrice || !!filters.inStock;

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 500;
    return Math.ceil(Math.max(...allProducts.map(p => p.base_price)) / 10) * 10;
  }, [allProducts]);

  return (
    <>
      <Helmet>
        <title>{storeName} | FastCRM</title>
        <meta name="description" content={storeSettings?.store_description || "Explore os nossos produtos e serviços"} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader
          storeName={storeName}
          logoUrl={storeSettings?.logo_url || undefined}
          onSearch={setSearch}
          workspaceSlug={wsId}
        />
        <StoreCartDrawer workspaceSlug={wsId} />

        {/* Hero */}
        {showHero && (
          <StoreHeroSection
            storeName={storeName}
            storeDescription={storeSettings?.store_description}
            bannerUrl={storeSettings?.banner_url}
            featuredProduct={featuredProducts[0]}
          />
        )}

        {showHero && <StoreTrustSection />}

        {showHero && featuredProducts.length > 0 && (
          <StoreFeaturedSection
            products={featuredProducts}
            workspaceSlug={wsId}
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
                        workspaceSlug={wsId}
                        tierPricing={tierPricing}
                        index={index}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
            <p>{storeSettings?.footer_text || `© ${new Date().getFullYear()} Todos os direitos reservados.`}</p>
          </div>
        </footer>
      </div>
    </>
  );
}
