import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Download, LucideIcon } from "lucide-react";

interface NexusPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  showFilter?: boolean;
  onFilterClick?: () => void;
  showExport?: boolean;
  onExportClick?: () => void;
  showAdd?: boolean;
  addLabel?: string;
  onAddClick?: () => void;
  className?: string;
}

export function NexusPageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  actions,
  showSearch = true,
  searchPlaceholder = "Pesquisar...",
  onSearchChange,
  searchValue,
  showFilter = true,
  onFilterClick,
  showExport = false,
  onExportClick,
  showAdd = true,
  addLabel = "Novo",
  onAddClick,
  className,
}: NexusPageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {badge && (
              <Badge variant="outline" className="text-xs font-normal">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {actions}
          {showAdd && onAddClick && (
            <Button 
              size="sm" 
              onClick={onAddClick}
              className="gap-1.5 bg-primary shadow-lg shadow-primary/25"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{addLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar Row */}
      {(showSearch || showFilter || showExport) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {showSearch && (
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showFilter && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onFilterClick}
                className="gap-1.5 h-9"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtrar</span>
              </Button>
            )}
            {showExport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onExportClick}
                className="gap-1.5 h-9"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
