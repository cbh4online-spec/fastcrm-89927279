import { useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { useStoreProducts, useStoreCategories } from "@/hooks/useStoreProducts";
import { useStoreTierPricing } from "@/hooks/useStoreTierPricing";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Sparkles, ArrowRight } from "lucide-react";

export default function StorePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name" | "newest" | undefined>();

  // For now, workspaceSlug maps to workspace_id — we'll handle slug resolution later
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

        {/* Hero Section */}
        {showHero && featuredProducts.length > 0 && (
          <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b">
            <div className="container mx-auto px-4 py-16 md:py-24">
              <div className="max-w-2xl">
                <Badge variant="secondary" className="mb-4 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Novidades
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                  {storeSettings?.store_description ? storeName : "Descubra os nossos produtos"}
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                  Explore o nosso catálogo completo de produtos e serviços. Qualidade premium com a melhor experiência de compra.
                </p>
                <Button size="lg" className="gap-2" onClick={() => {
                  document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
                }}>
                  Explorar Catálogo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          </section>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <section className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Button
                  variant={!selectedCategoryId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategoryId(undefined)}
                  className="whitespace-nowrap"
                >
                  Todos
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategoryId === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="whitespace-nowrap"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Products Grid */}
        <section id="products-section" className="container mx-auto px-4 py-8 md:py-12">
          {search && (
            <p className="text-sm text-muted-foreground mb-6">
              Resultados para "<span className="font-medium text-foreground">{search}</span>"
              {products.length > 0 && ` — ${products.length} produto${products.length !== 1 ? "s" : ""}`}
            </p>
          )}

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
