import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Star,
  Clock,
  Users,
  Activity,
  X,
  Plus,
  Bookmark,
} from "lucide-react";

export interface FilterItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterGroup {
  id: string;
  label: string;
  icon?: React.ReactNode;
  items: FilterItem[];
  defaultOpen?: boolean;
}

interface FilterSidebarProps {
  savedFilters?: FilterItem[];
  filterGroups: FilterGroup[];
  activeFilterId?: string;
  onFilterSelect: (filterId: string) => void;
  onSaveFilter?: () => void;
  onClearFilter?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function FilterSidebar({
  savedFilters = [],
  filterGroups,
  activeFilterId,
  onFilterSelect,
  onSaveFilter,
  onClearFilter,
  isOpen = true,
  onClose,
  className,
}: FilterSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    filterGroups.forEach((group) => {
      initial[group.id] = group.defaultOpen ?? true;
    });
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filteredGroups = filterGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0 || searchTerm === "");

  const filteredSaved = savedFilters.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={cn(
      "flex flex-col h-full w-64 border-r border-border bg-card",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filtros</span>
        </div>
        <div className="flex items-center gap-1">
          {activeFilterId && onClearFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
              className="h-7 px-2 text-xs"
            >
              Limpar
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar filtros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Saved Filters */}
          {(filteredSaved.length > 0 || savedFilters.length > 0) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Filtros Guardados
                </span>
                {onSaveFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onSaveFilter}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {filteredSaved.length > 0 ? (
                filteredSaved.map((filter) => (
                  <FilterItemButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilterId === filter.id}
                    onClick={() => onFilterSelect(filter.id)}
                    icon={<Bookmark className="h-4 w-4" />}
                  />
                ))
              ) : (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  Nenhum filtro guardado
                </p>
              )}
            </div>
          )}

          {/* Filter Groups */}
          {filteredGroups.map((group) => (
            <Collapsible
              key={group.id}
              open={openGroups[group.id]}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {group.icon}
                    <span>{group.label}</span>
                  </div>
                  {openGroups[group.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {group.items.map((filter) => (
                  <FilterItemButton
                    key={filter.id}
                    filter={filter}
                    isActive={activeFilterId === filter.id}
                    onClick={() => onFilterSelect(filter.id)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FilterItemButtonProps {
  filter: FilterItem;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function FilterItemButton({ filter, isActive, onClick, icon }: FilterItemButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-2">
        {icon || filter.icon}
        <span className="truncate">{filter.label}</span>
      </div>
      {typeof filter.count === "number" && (
        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
          {filter.count}
        </Badge>
      )}
    </button>
  );
}
