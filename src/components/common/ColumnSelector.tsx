import { useState, useEffect } from "react";
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
  onVisibleColumnsChange: (columns: Set<string>) => void;
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
  onVisibleColumnsChange,
  storageKey = "table-columns",
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  // Group columns by category
  const groupedColumns = columns.reduce((acc, col) => {
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
              {visibleColumns.size} de {columns.length} colunas
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
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggle(column.id)}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      <Checkbox
                        id={column.id}
                        checked={visibleColumns.has(column.id)}
                        onCheckedChange={() => handleToggle(column.id)}
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

// Hook to persist column preferences
export function useColumnPreferences(
  storageKey: string,
  defaultColumns: ColumnConfig[]
) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        // Invalid stored value
      }
    }
    return new Set(defaultColumns.filter((c) => c.defaultVisible).map((c) => c.id));
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(visibleColumns)));
  }, [storageKey, visibleColumns]);

  return [visibleColumns, setVisibleColumns] as const;
}
