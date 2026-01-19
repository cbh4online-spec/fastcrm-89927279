import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnConfig {
  id: string;
  label: string;
  description?: string;
  category: "basic" | "ai" | "business" | "relations";
  defaultVisible: boolean;
  width?: string;
}

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  visibleColumns: Set<string>;
  columnOrder: string[];
  onVisibleColumnsChange: (columns: Set<string>) => void;
  onColumnOrderChange: (order: string[]) => void;
  storageKey?: string;
}

const categoryLabels: Record<string, string> = {
  basic: "Informação Básica",
  ai: "Insights IA",
  business: "Dados de Negócio",
  relations: "Relações",
};

export function ColumnSelector({
  columns,
  visibleColumns,
  columnOrder,
  onVisibleColumnsChange,
  onColumnOrderChange,
  storageKey = "table-columns",
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Get ordered columns based on columnOrder
  const orderedColumns = [...columns].sort((a, b) => {
    const indexA = columnOrder.indexOf(a.id);
    const indexB = columnOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Group columns by category for display
  const groupedColumns = orderedColumns.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  const handleToggle = (columnId: string) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(columnId)) {
      newSet.delete(columnId);
    } else {
      newSet.add(columnId);
    }
    onVisibleColumnsChange(newSet);
  };

  const handleReset = () => {
    const defaultColumns = new Set(
      columns.filter((c) => c.defaultVisible).map((c) => c.id)
    );
    onVisibleColumnsChange(defaultColumns);
    onColumnOrderChange(columns.map(c => c.id));
  };

  const handleSelectAll = (category: string, selected: boolean) => {
    const newSet = new Set(visibleColumns);
    groupedColumns[category]?.forEach((col) => {
      if (selected) {
        newSet.add(col.id);
      } else {
        newSet.delete(col.id);
      }
    });
    onVisibleColumnsChange(newSet);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== columnId) {
      setDragOverId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      onColumnOrderChange(newOrder);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="font-medium text-sm">Colunas Visíveis</p>
            <p className="text-xs text-muted-foreground">
              {visibleColumns.size} de {columns.length} colunas • Arraste para ordenar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        <ScrollArea className="h-[350px]">
          <div className="p-2 space-y-4">
            {Object.entries(groupedColumns).map(([category, cols]) => (
              <div key={category}>
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {categoryLabels[category] || category}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const allSelected = cols.every((c) =>
                        visibleColumns.has(c.id)
                      );
                      handleSelectAll(category, !allSelected);
                    }}
                  >
                    {cols.every((c) => visibleColumns.has(c.id))
                      ? "Desmarcar"
                      : "Selecionar"}
                  </Button>
                </div>
                <div className="space-y-1">
                  {cols.map((column) => (
                    <div
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, column.id)}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors",
                        draggedId === column.id && "opacity-50",
                        dragOverId === column.id && "bg-primary/10 border border-primary/30"
                      )}
                      onClick={() => handleToggle(column.id)}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                      <Checkbox
                        id={column.id}
                        checked={visibleColumns.has(column.id)}
                        onCheckedChange={() => handleToggle(column.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={column.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {column.label}
                        </Label>
                        {column.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {column.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Hook to persist column preferences including order
export function useColumnPreferences(
  storageKey: string,
  defaultColumns: ColumnConfig[]
) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(`${storageKey}-visible`);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        // Invalid stored value
      }
    }
    return new Set(defaultColumns.filter((c) => c.defaultVisible).map((c) => c.id));
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem(`${storageKey}-order`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure all columns are in the order (add any missing ones at the end)
        const existingIds = new Set(parsed);
        const allIds = defaultColumns.map(c => c.id);
        const missingIds = allIds.filter(id => !existingIds.has(id));
        return [...parsed.filter((id: string) => allIds.includes(id)), ...missingIds];
      } catch {
        // Invalid stored value
      }
    }
    return defaultColumns.map((c) => c.id);
  });

  useEffect(() => {
    localStorage.setItem(`${storageKey}-visible`, JSON.stringify(Array.from(visibleColumns)));
  }, [storageKey, visibleColumns]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-order`, JSON.stringify(columnOrder));
  }, [storageKey, columnOrder]);

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    setColumnOrder,
  };
}
