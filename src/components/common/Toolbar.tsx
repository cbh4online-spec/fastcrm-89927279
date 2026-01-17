import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, ArrowUpDown, Columns3, X } from "lucide-react";

interface SortOption {
  value: string;
  label: string;
}

interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

interface ToolbarProps {
  // Search
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  
  // Filters
  showFilters?: boolean;
  filtersActive?: boolean;
  onToggleFilters?: () => void;
  onClearFilters?: () => void;
  
  // Sort
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  
  // Columns
  columns?: ColumnOption[];
  onColumnToggle?: (columnId: string) => void;
  
  // Custom actions
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  
  className?: string;
}

export function Toolbar({
  searchValue = "",
  searchPlaceholder = "Pesquisar...",
  onSearchChange,
  showFilters = true,
  filtersActive = false,
  onToggleFilters,
  onClearFilters,
  sortOptions,
  sortValue,
  onSortChange,
  columns,
  onColumnToggle,
  leftActions,
  rightActions,
  className,
}: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div className={cn(
      "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      "p-3 rounded-lg border border-border bg-card",
      className
    )}>
      {/* Left side */}
      <div className="flex items-center gap-2 flex-wrap">
        {showFilters && onToggleFilters && (
          <Button
            variant={filtersActive ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {filtersActive && (
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                ✓
              </span>
            )}
          </Button>
        )}

        {filtersActive && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}

        {sortOptions && sortOptions.length > 0 && (
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <ArrowUpDown className="h-3 w-3 mr-2" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {columns && columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns3 className="h-4 w-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.visible}
                  onCheckedChange={() => onColumnToggle?.(column.id)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {leftActions}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {rightActions}
        
        {onSearchChange && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-8"
            />
            {localSearch && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
