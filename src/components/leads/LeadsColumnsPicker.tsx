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

export interface LeadColumnDef {
  key: string;
  label: string;
  /** Always visible / cannot be hidden. */
  required?: boolean;
  /** Hidden by default but available to enable. */
  defaultVisible?: boolean;
}

export const LEAD_COLUMNS: LeadColumnDef[] = [
  { key: "status", label: "Estado", required: true },
  { key: "name", label: "Nome", required: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Telefone", defaultVisible: false },
  { key: "company", label: "Empresa", defaultVisible: false },
  { key: "source", label: "Origem", defaultVisible: false },
  { key: "temperature", label: "Temperatura", defaultVisible: false },
  { key: "score", label: "Score", defaultVisible: true },
  { key: "value", label: "Valor estimado", defaultVisible: true },
  { key: "created_at", label: "Data de criação", defaultVisible: true },
  { key: "last_contact", label: "Último contacto", defaultVisible: false },
  { key: "assigned_to", label: "Responsável", defaultVisible: false },
  { key: "tags", label: "Tags", defaultVisible: false },
];

const STORAGE_KEY = "leads-list-columns-v2";

export function getDefaultLeadColumns(): string[] {
  return LEAD_COLUMNS.filter((c) => c.required || c.defaultVisible).map(
    (c) => c.key
  );
}

export function useLeadColumns() {
  const [columns, setColumns] = useState<string[]>(() => {
    if (typeof window === "undefined") return getDefaultLeadColumns();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultLeadColumns();
      const parsed = JSON.parse(raw) as string[];
      const required = LEAD_COLUMNS.filter((c) => c.required).map((c) => c.key);
      const merged = Array.from(new Set([...required, ...parsed]));
      return merged.filter((k) => LEAD_COLUMNS.some((c) => c.key === k));
    } catch {
      return getDefaultLeadColumns();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
      /* ignore */
    }
  }, [columns]);

  return { columns, setColumns };
}

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function LeadsColumnsPicker({ value, onChange }: Props) {
  const toggle = (key: string, checked: boolean) => {
    const def = LEAD_COLUMNS.find((c) => c.key === key);
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
            onClick={() => onChange(getDefaultLeadColumns())}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
        <Separator className="mb-2" />
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
          {LEAD_COLUMNS.map((col) => {
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
