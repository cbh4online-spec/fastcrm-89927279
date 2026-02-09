import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Grid3X3 } from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreCategoryCarouselProps {
  categories: StoreCategory[];
  selectedCategoryId?: string;
  onSelectCategory: (id?: string) => void;
}

export function StoreCategoryCarousel({ categories, selectedCategoryId, onSelectCategory }: StoreCategoryCarouselProps) {
  if (categories.length === 0) return null;

  return (
    <section className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            <button
              onClick={() => onSelectCategory(undefined)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                !selectedCategoryId
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}
