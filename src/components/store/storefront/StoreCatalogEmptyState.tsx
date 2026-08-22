import { motion } from "framer-motion";
import { Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import type { StoreFilters } from "@/components/store/StoreFilterSidebar";

interface StoreCatalogEmptyStateProps {
  search?: string;
  isFiltering: boolean;
  onClearFilters: () => void;
  onClearSearch?: () => void;
  suggestions?: any[];
  wsSlug: string;
  tierPricing?: any;
}

export function StoreCatalogEmptyState({
  search,
  isFiltering,
  onClearFilters,
  onClearSearch,
  suggestions = [],
  wsSlug,
  tierPricing,
}: StoreCatalogEmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-12">
      <div className="text-center max-w-md mx-auto">
        <Package className="h-14 w-14 mx-auto text-muted-foreground/25 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sem resultados</h2>
        <p className="text-muted-foreground text-sm">
          {search
            ? `Não encontrámos produtos para “${search}”.`
            : isFiltering
              ? "Nenhum produto corresponde aos filtros selecionados."
              : "A loja ainda não tem produtos publicados."}
        </p>
        {(isFiltering || search) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {isFiltering && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onClearFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
            {search && onClearSearch && (
              <Button variant="ghost" size="sm" onClick={onClearSearch}>
                Limpar pesquisa
              </Button>
            )}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-12">
          <h3 className="text-sm font-semibold text-foreground mb-4">Talvez goste destes</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {suggestions.slice(0, 4).map((p, i) => (
              <StoreProductCard
                key={p.id}
                product={p}
                workspaceSlug={wsSlug}
                tierPricing={tierPricing}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export type { StoreFilters };
