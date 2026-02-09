import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreFeaturedSectionProps {
  products: StoreProduct[];
  workspaceSlug: string;
  tierPricing?: any;
}

/**
 * AIDA — DESEJO (Desire)
 * Produtos em destaque com visual premium para gerar desejo de compra.
 */
export function StoreFeaturedSection({ products, workspaceSlug, tierPricing }: StoreFeaturedSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Destaques</h2>
            </div>
            <p className="text-muted-foreground">Os produtos mais populares escolhidos para si</p>
          </div>
          <Button
            variant="ghost"
            className="hidden md:flex gap-1 text-primary"
            onClick={() => {
              document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.slice(0, 4).map((product) => (
            <StoreProductCard
              key={product.id}
              product={product}
              workspaceSlug={workspaceSlug}
              tierPricing={tierPricing}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
