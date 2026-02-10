import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Grid3X3 } from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreCategoryCarouselProps {
  categories: StoreCategory[];
  selectedCategoryId?: string;
  onSelectCategory: (id?: string) => void;
}

const CATEGORY_GRADIENTS = [
  "from-rose-500/80 to-orange-400/80",
  "from-violet-500/80 to-purple-400/80",
  "from-blue-500/80 to-cyan-400/80",
  "from-emerald-500/80 to-teal-400/80",
  "from-amber-500/80 to-yellow-400/80",
  "from-pink-500/80 to-fuchsia-400/80",
  "from-indigo-500/80 to-blue-400/80",
  "from-lime-500/80 to-green-400/80",
];

export function StoreCategoryCarousel({ categories, selectedCategoryId, onSelectCategory }: StoreCategoryCarouselProps) {
  if (categories.length === 0) return null;

  return (
    <section className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2 snap-x snap-mandatory">
            {/* "Todos" card */}
            <button
              onClick={() => onSelectCategory(undefined)}
              className={`flex-shrink-0 snap-start relative w-[140px] h-[80px] rounded-xl overflow-hidden transition-all duration-200 ${
                !selectedCategoryId
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.03]"
                  : "hover:scale-[1.02]"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/60" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1.5">
                <Grid3X3 className="h-5 w-5 text-white" />
                <span className="text-sm font-semibold text-white">Todos</span>
              </div>
            </button>

            {categories.map((cat, index) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 snap-start relative w-[140px] h-[80px] rounded-xl overflow-hidden transition-all duration-200 ${
                  selectedCategoryId === cat.id
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.03]"
                    : "hover:scale-[1.02]"
                }`}
              >
                {/* Background: image or gradient fallback */}
                {cat.image_url ? (
                  <>
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length]}`} />
                )}

                {/* Label */}
                <div className="relative z-10 flex items-end justify-center h-full pb-3 px-2">
                  <span className="text-sm font-semibold text-white text-center leading-tight line-clamp-2 drop-shadow-md">
                    {cat.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}
