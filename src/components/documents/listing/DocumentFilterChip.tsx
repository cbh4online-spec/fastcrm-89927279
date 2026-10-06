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
    "flex shrink-0 items-center justify-between text-left transition-colors border bg-card",
    "max-md:h-9 max-md:gap-1.5 max-md:rounded-full max-md:px-3",
    "md:h-14 md:min-w-[140px] md:gap-3 md:rounded-xl md:px-4 md:py-2 md:shadow-sm",
    "hover:border-primary/60",
    active ? "border-primary ring-1 ring-primary/30" : "border-border"
  );

  const content = (
    <>
      <div className="flex items-baseline gap-1 md:flex-col md:items-start md:gap-0">
        <span className="text-[11px] font-medium text-muted-foreground md:uppercase md:tracking-wider">
          {label}
          <span className="md:hidden">:</span>
        </span>
        <span
          className={cn(
            "whitespace-nowrap text-xs md:text-sm font-semibold",
            active ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </span>
      </div>
      <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
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
