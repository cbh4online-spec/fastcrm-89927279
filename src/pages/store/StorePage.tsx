import { useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreHeroSection } from "@/components/store/sections/StoreHeroSection";
import { StoreTrustSection } from "@/components/store/sections/StoreTrustSection";
import { StoreFeaturedSection } from "@/components/store/sections/StoreFeaturedSection";
import { StoreCTABanner } from "@/components/store/sections/StoreCTABanner";
import { StoreCategoryNav } from "@/components/store/sections/StoreCategoryNav";
import { useStoreProducts, useStoreCategories } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export default function StorePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name" | "newest" | undefined>();

  const wsId = workspaceSlug || "";

  const { data: products = [], isLoading } = useStoreProducts({
    workspaceId: wsId,
    categoryId: selectedCategoryId,
    search,
    sortBy,
  });

  const { data: featuredProducts = [] } = useStoreProducts({
    workspaceId: wsId,
    featured: true,
  });

  const { data: categories = [] } = useStoreCategories(wsId);
  const { data: tierPricing } = useStoreTierPricing(wsId);
  const { data: storeSettings } = usePublicStoreSettings(wsId);

  const storeName = storeSettings?.store_name || "Loja";
  const showHero = !search && !selectedCategoryId;
  const isFiltering = !!search || !!selectedCategoryId;

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

        {/* A — ATENÇÃO: Hero impactante */}
        {showHero && (
          <StoreHeroSection
            storeName={storeName}
            storeDescription={storeSettings?.store_description}
            bannerUrl={storeSettings?.banner_url}
            featuredProduct={featuredProducts[0]}
          />
        )}

        {/* I — INTERESSE: Confiança e credibilidade */}
        {showHero && <StoreTrustSection />}

        {/* D — DESEJO: Produtos em destaque */}
        {showHero && featuredProducts.length > 0 && (
          <StoreFeaturedSection
            products={featuredProducts}
            workspaceSlug={wsId}
            tierPricing={tierPricing}
          />
        )}

        {/* A — AÇÃO: CTA Banner */}
        {showHero && <StoreCTABanner />}

        {/* Navigation: Categorias + Filtros */}
        {categories.length > 0 && (
          <StoreCategoryNav
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            sortBy={sortBy}
            onSortChange={(v) => setSortBy(v === "default" ? undefined : v as any)}
            totalProducts={products.length}
          />
        )}

        {/* Products Grid */}
        <section id="products-section" className="container mx-auto px-4 py-8 md:py-12">
          {search && (
            <p className="text-sm text-muted-foreground mb-6">
              Resultados para "<span className="font-medium text-foreground">{search}</span>"
              {products.length > 0 && ` — ${products.length} produto${products.length !== 1 ? "s" : ""}`}
            </p>
          )}

          {!isFiltering && !showHero && null}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sem produtos disponíveis</h2>
              <p className="text-muted-foreground">
                {search
                  ? "Nenhum produto encontrado para esta pesquisa."
                  : "A loja ainda não tem produtos publicados."}
              </p>
            </div>
          ) : (
            <>
              {!isFiltering && (
                <h2 className="text-2xl font-bold text-foreground mb-6">Todo o Catálogo</h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <StoreProductCard
                    key={product.id}
                    product={product}
                    workspaceSlug={wsId}
                    tierPricing={tierPricing}
                  />
                ))}
              </div>
            </>
          )}
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
