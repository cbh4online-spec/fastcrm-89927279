import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Package, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreNewArrivalsProps {
  products: StoreProduct[];
  workspaceSlug: string;
}

export function StoreNewArrivals({ products, workspaceSlug }: StoreNewArrivalsProps) {
  // Filter products created in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newProducts = products
    .filter((p) => p.created_at && new Date(p.created_at) >= sevenDaysAgo)
    .slice(0, 8);

  if (newProducts.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Novidades</h2>
            <p className="text-sm text-muted-foreground">Adicionados recentemente ao catálogo</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="hidden md:flex gap-1 text-primary"
          onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {newProducts.map((product, i) => {
          const imgIdx = product.primary_image_index ?? 0;
          const img = product.images?.[imgIdx] || product.images?.[0];

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Link
                to={`/store/${workspaceSlug}/product/${product.id}`}
                className="group block"
              >
                <div className="relative rounded-2xl overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* "New" badge with pulse */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-500 text-white border-0 gap-1 shadow-md animate-pulse">
                        <Sparkles className="h-3 w-3" />
                        Novo
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    {product.category && (
                      <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest">
                        {product.category}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {product.name}
                    </p>
                    <span className="block text-base font-bold text-primary">
                      €{product.base_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
