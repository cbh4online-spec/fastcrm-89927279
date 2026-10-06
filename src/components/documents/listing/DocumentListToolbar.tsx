import { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SortOption {
  value: string;
  label: string;
}

interface DocumentListToolbarProps {
  selectAllChecked?: boolean;
  onSelectAll?: (checked: boolean) => void;
  selectLabel?: string;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (v: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSortDirection?: () => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (v: number) => void;
  totalCount?: number;
  countLabel?: string;
  onClearFilters?: () => void;
  clearFiltersDisabled?: boolean;
  extra?: ReactNode;
}

export function DocumentListToolbar({
  selectAllChecked,
  onSelectAll,
  selectLabel = "Selecionar Página",
  sortOptions,
  sortValue,
  onSortChange,
  sortDirection = "desc",
  onToggleSortDirection,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  totalCount,
  countLabel = "Documentos",
  onClearFilters,
  clearFiltersDisabled,
  extra,
}: DocumentListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm text-muted-foreground">
      {onSelectAll && (
        <label className="flex items-center gap-2">
          <Checkbox
            checked={selectAllChecked}
            onCheckedChange={(c) => onSelectAll(c === true)}
          />
          <span>{selectLabel}</span>
        </label>
      )}

      <div className="flex w-full flex-wrap md:w-auto md:ml-auto items-center gap-x-1.5 md:gap-x-6 gap-y-2 max-md:text-xs [&>*:last-child]:max-md:ml-auto">
        {sortOptions && onSortChange && (
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <span className="max-md:sr-only">Ordenar por</span>
            <Select value={sortValue} onValueChange={onSortChange}>
              <SelectTrigger className="h-8 w-auto md:w-[140px] gap-1 border-none bg-transparent px-2 text-foreground shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onToggleSortDirection && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleSortDirection}
              >
                {sortDirection === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {onPageSizeChange && (
          <div className="hidden md:flex items-center gap-2">
            <span>Resultados por Página</span>
            <Select
              value={pageSize?.toString()}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px] border-none bg-transparent px-2 text-foreground shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {typeof totalCount === "number" && (
          <span className="shrink-0 whitespace-nowrap font-semibold text-foreground max-md:order-first max-md:mr-1">
            {totalCount} {countLabel}
          </span>
        )}

        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            disabled={clearFiltersDisabled}
            className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar filtros
          </button>
        )}

        {extra}
      </div>
    </div>
  );
}
