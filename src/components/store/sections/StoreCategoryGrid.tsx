import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreCategoryGridProps {
  categories: StoreCategory[];
  productCountByCategory?: Map<string, number>;
  onSelectCategory: (id: string) => void;
}

// Palette of soft gradient pairs for category cards
const CARD_GRADIENTS = [
  "from-violet-500/15 to-purple-600/10",
  "from-sky-500/15 to-blue-600/10",
  "from-emerald-500/15 to-teal-600/10",
  "from-amber-500/15 to-orange-600/10",
  "from-rose-500/15 to-pink-600/10",
  "from-indigo-500/15 to-blue-700/10",
];

export function StoreCategoryGrid({ categories, productCountByCategory, onSelectCategory }: StoreCategoryGridProps) {
  if (categories.length === 0) return null;

  const visibleCats = categories.slice(0, 6);

  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Explorar Categorias</h2>
          <p className="text-muted-foreground mt-1 text-sm">Encontre exatamente o que precisa</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {visibleCats.map((cat, i) => {
          const count = productCountByCategory?.get(cat.id) || 0;
          const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 md:p-8 text-left transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20",
                gradient
              )}
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />

              <div className="relative z-10 flex flex-col justify-between min-h-[100px] md:min-h-[120px]">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  {count > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {count} produto{count !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    Explorar <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* Decorative circle */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
