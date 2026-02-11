import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/hooks/useStoreProducts";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface StoreBestSellersProps {
  products: StoreProduct[];
  salesCounts: Map<string, number>;
  workspaceSlug: string;
}

const MEDAL_COLORS: Record<number, string> = {
  0: "bg-amber-400 text-amber-950",     // Gold
  1: "bg-slate-300 text-slate-800",      // Silver
  2: "bg-amber-600 text-amber-50",       // Bronze
};

export function StoreBestSellers({ products, salesCounts, workspaceSlug }: StoreBestSellersProps) {
  // Rank products by sales
  const ranked = [...products]
    .map((p) => ({ product: p, sales: salesCounts.get(p.id) || 0 }))
    .filter((r) => r.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  if (ranked.length < 2) return null;

  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Mais Vendidos</h2>
            <p className="text-sm text-muted-foreground">Os favoritos dos nossos clientes</p>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {ranked.map(({ product, sales }, i) => {
              const imgIdx = product.primary_image_index ?? 0;
              const img = product.images?.[imgIdx] || product.images?.[0];
              const isMedal = i < 3;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <Link
                    to={`/store/${workspaceSlug}/product/${product.id}`}
                    className="flex-shrink-0 w-44 md:w-48 group block"
                  >
                    <div className="relative rounded-xl overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
                      {/* Rank badge */}
                      <div className={cn(
                        "absolute top-2.5 left-2.5 z-10 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
                        isMedal ? MEDAL_COLORS[i] : "bg-background border text-foreground"
                      )}>
                        {i + 1}
                      </div>

                      {/* Trending badge for top 3 */}
                      {isMedal && (
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" />
                            Tendência
                          </Badge>
                        </div>
                      )}

                      <div className="aspect-square overflow-hidden bg-muted">
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>

                      <div className="p-3 space-y-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">€{product.base_price.toFixed(2)} <StoreVatLabel /></span>
                          <span className="text-[10px] text-muted-foreground">
                            {sales >= 500 ? "500+" : sales >= 100 ? "100+" : `${sales}+`} vendidos
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}
