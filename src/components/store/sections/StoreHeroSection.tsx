import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreHeroSectionProps {
  storeName: string;
  storeDescription?: string | null;
  bannerUrl?: string | null;
  featuredProduct?: StoreProduct;
}

/**
 * AIDA — ATENÇÃO (Attention)
 * Hero visual impactante com gradiente, produto destaque e CTA claro.
 */
export function StoreHeroSection({ storeName, storeDescription, bannerUrl, featuredProduct }: StoreHeroSectionProps) {
  const heroImage = featuredProduct?.images?.[featuredProduct.primary_image_index ?? 0] || featuredProduct?.images?.[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      </div>

      {bannerUrl && (
        <div className="absolute inset-0">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover opacity-20" />
        </div>
      )}

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge className="bg-white/20 text-primary-foreground border-white/30 backdrop-blur-sm gap-1.5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Novidades disponíveis
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Bem-vindo à {storeName}
            </h1>

            {storeDescription && (
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-lg leading-relaxed">
                {storeDescription}
              </p>
            )}

            <p className="text-base md:text-lg text-primary-foreground/60 max-w-lg leading-relaxed">
              Qualidade garantida e entrega sem complicações.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 font-semibold text-base px-8 shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Ver Catálogo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Featured product visual */}
          {heroImage && (
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-3xl blur-2xl scale-110" />
                <img
                  src={heroImage}
                  alt={featuredProduct?.name || "Produto destaque"}
                  className="relative w-80 h-80 lg:w-96 lg:h-96 object-cover rounded-3xl shadow-2xl ring-1 ring-white/20"
                />
                {featuredProduct && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <p className="text-sm font-semibold text-foreground truncate">{featuredProduct.name}</p>
                    <p className="text-primary text-lg font-bold">€{featuredProduct.base_price.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
