import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildFilterChips } from "@/lib/store/catalogClientFilters";
import type { StoreFilters } from "@/components/store/StoreFilterSidebar";

interface StoreActiveFilterChipsProps {
  filters: StoreFilters;
  categories: { id: string; name: string }[];
  onFiltersChange: (filters: StoreFilters) => void;
  search?: string;
  onClearSearch?: () => void;
}

export function StoreActiveFilterChips({
  filters,
  categories,
  onFiltersChange,
  search,
  onClearSearch,
}: StoreActiveFilterChipsProps) {
  const chips = buildFilterChips(filters, categories);
  const hasSearch = !!search && !!onClearSearch;
  if (chips.length === 0 && !hasSearch) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {hasSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/5 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
        >
          Pesquisa: “{search}”
          <X className="h-3 w-3" />
        </button>
      )}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onFiltersChange(chip.clear())}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          aria-label={`Remover filtro ${chip.label}`}
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      {chips.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onFiltersChange({ sortBy: filters.sortBy })}
        >
          Limpar tudo
        </Button>
      )}
    </div>
  );
}
