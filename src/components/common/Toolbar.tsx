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
import { Search, SlidersHorizontal, ArrowUpDown, Columns3, X, Sparkles } from "lucide-react";

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
      "p-3 rounded-lg bg-muted/30 border border-border/30",
      className
    )}>
      {/* Left side */}
      <div className="flex items-center gap-2 flex-wrap">
        {showFilters && onToggleFilters && (
          <Button
            variant={filtersActive ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              "gap-2 rounded-lg transition-all duration-200",
              filtersActive && "bg-primary/90 shadow-md shadow-primary/20"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {filtersActive && (
              <span className="ml-1 flex h-2 w-2 rounded-full bg-primary-foreground/60" />
            )}
          </Button>
        )}

        {filtersActive && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1 text-muted-foreground hover:text-destructive rounded-lg"
          >
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}

        {sortOptions && sortOptions.length > 0 && (
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-sm rounded-lg border-border/50 bg-background/50">
              <ArrowUpDown className="h-3 w-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
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
              <Button variant="outline" size="sm" className="gap-2 rounded-lg border-border/50">
                <Columns3 className="h-4 w-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] bg-popover z-50">
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
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9 h-9 rounded-lg border-border/50 bg-background/50 focus:bg-background transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
