import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  LayoutGrid, 
  Table2, 
  Users, 
  Kanban, 
  Columns3, 
  Save, 
  BookmarkPlus,
  ChevronDown,
} from "lucide-react";
import { CrmEntityType, CrmViewMode } from "@/hooks/useCrmViews";
import { cn } from "@/lib/utils";

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
}

interface CrmHeaderProps {
  entityType: CrmEntityType;
  viewMode: CrmViewMode;
  searchQuery: string;
  visibleColumns: string[];
  columns: ColumnDef[];
  selectedViewId: string | null;
  hasUnsavedChanges: boolean;
  onEntityChange: (entity: CrmEntityType) => void;
  onViewModeChange: (mode: CrmViewMode) => void;
  onSearchChange: (query: string) => void;
  onColumnsChange: (columns: string[]) => void;
  onSaveView: () => void;
  onUpdateView: () => void;
  onOpenViewSelector: () => void;
}

export function CrmHeader({
  entityType,
  viewMode,
  searchQuery,
  visibleColumns,
  columns,
  selectedViewId,
  hasUnsavedChanges,
  onEntityChange,
  onViewModeChange,
  onSearchChange,
  onColumnsChange,
  onSaveView,
  onUpdateView,
  onOpenViewSelector,
}: CrmHeaderProps) {
  const handleColumnToggle = (columnKey: string) => {
    const column = columns.find(c => c.key === columnKey);
    if (column?.required) return;

    if (visibleColumns.includes(columnKey)) {
      onColumnsChange(visibleColumns.filter(c => c !== columnKey));
    } else {
      onColumnsChange([...visibleColumns, columnKey]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: Entity toggle + View mode + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Entity Toggle */}
          <Tabs 
            value={entityType} 
            onValueChange={(v) => onEntityChange(v as CrmEntityType)}
            className="w-auto"
          >
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="contacts" className="flex items-center gap-2 px-4">
                <Users className="h-4 w-4" />
                Contactos
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="flex items-center gap-2 px-4">
                <Kanban className="h-4 w-4" />
                Oportunidades
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("table")}
              className="h-8"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("board")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Views Selector */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenViewSelector}
            className="flex items-center gap-2"
          >
            <BookmarkPlus className="h-4 w-4" />
            Vistas
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Save Actions */}
          {hasUnsavedChanges && selectedViewId && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateView}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveView}
            className="flex items-center gap-2"
          >
            <BookmarkPlus className="h-4 w-4" />
            Nova Vista
          </Button>
        </div>
      </div>

      {/* Second row: Search + Column selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={entityType === "contacts" ? "Pesquisar contactos..." : "Pesquisar oportunidades..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {viewMode === "table" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Columns3 className="h-4 w-4" />
                Colunas
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.includes(column.key)}
                  onCheckedChange={() => handleColumnToggle(column.key)}
                  disabled={column.required}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
