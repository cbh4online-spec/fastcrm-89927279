import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Filter, Plus, MoreHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortOption {
  value: string;
  label: string;
}

interface ActiveFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface AttioFilterBarProps {
  sortValue: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onDuplicates?: () => void;
  filterFields?: { value: string; label: string }[];
}

export function AttioFilterBar({
  sortValue,
  sortOptions,
  onSortChange,
  searchValue,
  onSearchChange,
  onRefresh,
  onExport,
  onDuplicates,
  filterFields = [],
}: AttioFilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showSearch, setShowSearch] = useState(!!searchValue);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [newFilterField, setNewFilterField] = useState("");
  const [newFilterValue, setNewFilterValue] = useState("");

  const currentSortLabel = sortOptions.find(s => s.value === sortValue)?.label || "Mais recentes";

  const addFilter = () => {
    if (!newFilterField || !newFilterValue) return;
    const fieldLabel = filterFields.find(f => f.value === newFilterField)?.label || newFilterField;
    setActiveFilters(prev => [
      ...prev,
      { id: crypto.randomUUID(), field: newFilterField, operator: "contains", value: newFilterValue },
    ]);
    setNewFilterField("");
    setNewFilterValue("");
    setFilterPopoverOpen(false);
  };

  const removeFilter = (id: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 min-h-[36px] flex-wrap">
      {/* Sort indicator */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <ArrowUpDown className="h-3 w-3" />
            <span className="hidden sm:inline">Sorted by</span>
            <span className="text-foreground">{currentSortLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-1 bg-popover z-50">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors",
                sortValue === opt.value && "bg-accent font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Separator */}
      <div className="w-px h-4 bg-border" />

      {/* Advanced filter badge */}
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
            activeFilters.length > 0
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}>
            <Filter className="h-3 w-3" />
            Advanced filter
            {activeFilters.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3 bg-popover z-50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar filtro</p>
          <div className="space-y-2">
            <Select value={newFilterField} onValueChange={setNewFilterField}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Campo..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {filterFields.map(f => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newFilterValue}
              onChange={(e) => setNewFilterValue(e.target.value)}
              placeholder="Valor..."
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && addFilter()}
            />
            <Button size="sm" className="w-full h-7 text-xs" onClick={addFilter} disabled={!newFilterField || !newFilterValue}>
              Aplicar filtro
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilters.map(f => {
        const label = filterFields.find(ff => ff.value === f.field)?.label || f.field;
        return (
          <Badge key={f.id} variant="secondary" className="gap-1 text-xs h-6 pl-2 pr-1">
            {label}: {f.value}
            <button onClick={() => removeFilter(f.id)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}

      {/* Add filter button */}
      <button
        onClick={() => setFilterPopoverOpen(true)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search toggle */}
      {showSearch ? (
        <div className="relative flex items-center">
          <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar..."
            className="h-7 w-48 pl-7 pr-7 text-xs bg-muted/40 border-transparent focus:border-border"
            autoFocus
          />
          <button
            onClick={() => { setShowSearch(false); onSearchChange(""); }}
            className="absolute right-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      )}

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover z-50">
          {onRefresh && <DropdownMenuItem onClick={onRefresh}>Atualizar</DropdownMenuItem>}
          {onExport && <DropdownMenuItem onClick={onExport}>Exportar CSV</DropdownMenuItem>}
          {onDuplicates && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDuplicates}>Gerir duplicados</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
