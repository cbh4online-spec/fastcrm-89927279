import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreCategory } from "@/hooks/useStoreProducts";

export interface StoreFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "name" | "newest";
}

interface StoreFilterSidebarProps {
  categories: StoreCategory[];
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  totalProducts: number;
  maxProductPrice?: number;
}

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterContent({ categories, filters, onFiltersChange, maxProductPrice = 500 }: Omit<StoreFilterSidebarProps, "totalProducts">) {
  const priceRange = [filters.minPrice ?? 0, filters.maxPrice ?? maxProductPrice];
  const activeCount = [filters.categoryId, filters.minPrice, filters.maxPrice, filters.inStock].filter(Boolean).length;

  return (
    <div className="space-y-1">
      {activeCount > 0 && (
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs text-muted-foreground">{activeCount} filtro{activeCount !== 1 ? "s" : ""} ativo{activeCount !== 1 ? "s" : ""}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onFiltersChange({})}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      <FilterSection title="Categorias">
        <div className="space-y-2">
          <button
            className={cn(
              "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
              !filters.categoryId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => onFiltersChange({ ...filters, categoryId: undefined })}
          >
            Todas as categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={cn(
                "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
                filters.categoryId === cat.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => onFiltersChange({ ...filters, categoryId: cat.id })}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterSection>

      <Separator />

      <FilterSection title="Preço">
        <div className="px-1 pt-2 space-y-4">
          <Slider
            value={priceRange}
            onValueChange={([min, max]) => onFiltersChange({ ...filters, minPrice: min || undefined, maxPrice: max >= maxProductPrice ? undefined : max })}
            max={maxProductPrice}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>€{priceRange[0]}</span>
            <span>€{priceRange[1] >= maxProductPrice ? `${maxProductPrice}+` : priceRange[1]}</span>
          </div>
        </div>
      </FilterSection>

      <Separator />

      <FilterSection title="Disponibilidade">
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <Checkbox
            checked={!!filters.inStock}
            onCheckedChange={(checked) => onFiltersChange({ ...filters, inStock: checked === true ? true : undefined })}
          />
          <span className="text-sm text-muted-foreground">Apenas em stock</span>
        </label>
      </FilterSection>

      <Separator />

      <FilterSection title="Ordenar por">
        <Select
          value={filters.sortBy || "default"}
          onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v === "default" ? undefined : v as StoreFilters["sortBy"] })}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Recomendados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Recomendados</SelectItem>
            <SelectItem value="price_asc">Preço: menor</SelectItem>
            <SelectItem value="price_desc">Preço: maior</SelectItem>
            <SelectItem value="name">Nome A-Z</SelectItem>
            <SelectItem value="newest">Mais recentes</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
}

export function StoreFilterSidebar(props: StoreFilterSidebarProps) {
  const activeCount = [props.filters.categoryId, props.filters.minPrice, props.filters.maxPrice, props.filters.inStock].filter(Boolean).length;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-36 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </h3>
            <span className="text-xs text-muted-foreground">{props.totalProducts} produto{props.totalProducts !== 1 ? "s" : ""}</span>
          </div>
          <FilterContent {...props} />
        </div>
      </aside>

      {/* Mobile filter sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
