import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";

interface DocumentFilterChipProps {
  label: string;
  value: string;
  active?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}

/**
 * Chip-filtro estilo InvoiceXpress: label pequeno por cima, valor por baixo,
 * borda primária quando ativo. Aceita um menu (children) ou um onClick.
 */
export function DocumentFilterChip({
  label,
  value,
  active,
  children,
  onClick,
}: DocumentFilterChipProps) {
  const triggerClasses = cn(
    "flex h-14 min-w-[140px] items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2 text-left shadow-sm transition-colors",
    "hover:border-primary/60",
    active ? "border-primary ring-1 ring-primary/30" : "border-border"
  );

  const content = (
    <>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            active ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </span>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </>
  );

  if (children) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerClasses}>
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <button type="button" onClick={onClick} className={triggerClasses}>
      {content}
    </button>
  );
}
