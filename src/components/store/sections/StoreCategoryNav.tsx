import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreCategoryNavProps {
  categories: StoreCategory[];
  selectedCategoryId?: string;
  onSelectCategory: (id: string | undefined) => void;
  sortBy?: string;
  onSortChange: (value: string) => void;
  totalProducts: number;
}

export function StoreCategoryNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
  sortBy,
  onSortChange,
  totalProducts,
}: StoreCategoryNavProps) {
  return (
    <div className="border-b bg-background sticky top-16 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            <Button
              variant={!selectedCategoryId ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectCategory(undefined)}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Sort + Count */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {totalProducts} produto{totalProducts !== 1 ? "s" : ""}
            </span>
            <Select value={sortBy || "default"} onValueChange={onSortChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Recomendados</SelectItem>
                <SelectItem value="price_asc">Preço: menor</SelectItem>
                <SelectItem value="price_desc">Preço: maior</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="newest">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
