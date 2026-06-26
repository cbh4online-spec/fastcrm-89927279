import { useEffect, useState } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface ListColumnDef {
  key: string;
  label: string;
  required?: boolean;
  defaultVisible?: boolean;
}

export function getDefaultColumns(defs: ListColumnDef[]): string[] {
  return defs.filter((c) => c.required || c.defaultVisible).map((c) => c.key);
}

export function useListColumns(storageKey: string, defs: ListColumnDef[]) {
  const [columns, setColumns] = useState<string[]>(() => {
    if (typeof window === "undefined") return getDefaultColumns(defs);
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return getDefaultColumns(defs);
      const parsed = JSON.parse(raw) as string[];
      const required = defs.filter((c) => c.required).map((c) => c.key);
      const merged = Array.from(new Set([...required, ...parsed]));
      return merged.filter((k) => defs.some((c) => c.key === k));
    } catch {
      return getDefaultColumns(defs);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch {
      /* ignore */
    }
  }, [columns, storageKey]);

  return { columns, setColumns };
}

interface Props {
  definitions: ListColumnDef[];
  value: string[];
  onChange: (next: string[]) => void;
}

export function ListColumnsPicker({ definitions, value, onChange }: Props) {
  const toggle = (key: string, checked: boolean) => {
    const def = definitions.find((c) => c.key === key);
    if (def?.required) return;
    if (checked) {
      onChange(Array.from(new Set([...value, key])));
    } else {
      onChange(value.filter((k) => k !== key));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-sm">
          <Columns3 className="h-4 w-4" />
          Colunas
          <span className="rounded-full bg-muted px-1.5 text-xs font-medium">
            {value.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Colunas visíveis</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange(getDefaultColumns(definitions))}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <Separator className="mb-2" />
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
          {definitions.map((col) => {
            const checked = value.includes(col.key);
            return (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  disabled={col.required}
                  onCheckedChange={(c) => toggle(col.key, c === true)}
                />
                <span className="text-sm">
                  {col.label}
                  {col.required && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (fixa)
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
