import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LayoutGrid, List, Rows3, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterContent,
  countActiveFilters,
  type StoreFilters,
} from "@/components/store/StoreFilterSidebar";

export type CatalogViewMode = "grid" | "list";
export type CatalogDensity = "comfortable" | "compact";

interface StoreCatalogToolbarProps {
  total: number;
  filters: StoreFilters;
  onFiltersChange: (filters: StoreFilters) => void;
  categories: any[];
  brandFacets: { value: string; count: number }[];
  maxProductPrice: number;
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  density: CatalogDensity;
  onDensityChange: (density: CatalogDensity) => void;
}

const SORT_OPTIONS = [
  { value: "default", label: "Recomendados" },
  { value: "best_sellers", label: "Mais vendidos" },
  { value: "rating", label: "Melhor avaliados" },
  { value: "discount", label: "Maior desconto" },
  { value: "price_asc", label: "Preço: menor" },
  { value: "price_desc", label: "Preço: maior" },
  { value: "newest", label: "Mais recentes" },
  { value: "name", label: "Nome A-Z" },
];

export function StoreCatalogToolbar({
  total,
  filters,
  onFiltersChange,
  categories,
  brandFacets,
  maxProductPrice,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
}: StoreCatalogToolbarProps) {
  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex items-center justify-between gap-2 border-b pb-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        {/* Filtros — mobile */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 lg:hidden" aria-label="Abrir filtros">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <Badge className="h-4 min-w-4 rounded-full p-0 px-1 text-[10px] flex items-center justify-center">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent
                categories={categories}
                filters={filters}
                onFiltersChange={onFiltersChange}
                maxProductPrice={maxProductPrice}
                brandFacets={brandFacets}
              />
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <strong className="text-foreground">{total}</strong> produto{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Densidade — desktop */}
        <div className="hidden md:flex items-center rounded-full border p-0.5">
          <button
            type="button"
            aria-label="Vista confortável"
            aria-pressed={density === "comfortable"}
            onClick={() => onDensityChange("comfortable")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              density === "comfortable" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Vista compacta"
            aria-pressed={density === "compact"}
            onClick={() => onDensityChange("compact")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              density === "compact" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Rows3 className="h-4 w-4" />
          </button>
        </div>

        {/* Grelha / Lista */}
        <div className="flex items-center rounded-full border p-0.5">
          <button
            type="button"
            aria-label="Ver em grelha"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Ver em lista"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Select
          value={filters.sortBy || "default"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, sortBy: v === "default" ? undefined : (v as StoreFilters["sortBy"]) })
          }
        >
          <SelectTrigger className="h-9 w-[150px] rounded-full text-sm" aria-label="Ordenar produtos">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
