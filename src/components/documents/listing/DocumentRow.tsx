import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface DocumentRowProps {
  selected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
  statusBadge?: ReactNode;
  /** Número do documento (ex.: FAC4/182). */
  number: string;
  /** Subtítulo curto (ex.: FATURA, NOTA DE ENCOMENDA, PROPOSTA). */
  subtitle?: string;
  /** Nome do cliente. */
  clientName: string;
  /** Linha extra opcional sob o cliente (ex.: NIF, email). */
  clientSubtitle?: string;
  /** Datas de emissão / vencimento. */
  issueDate?: string;
  dueDate?: string;
  dueDateTone?: "default" | "overdue";
  /** Total principal e secundário (s/IVA). */
  totalPrimary: string;
  totalSecondary?: string;
  /** Ação à direita (ícone ou menu). */
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DocumentRow({
  selected,
  onSelectedChange,
  statusBadge,
  number,
  subtitle,
  clientName,
  clientSubtitle,
  issueDate,
  dueDate,
  dueDateTone = "default",
  totalPrimary,
  totalSecondary,
  action,
  onClick,
  className,
}: DocumentRowProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "grid grid-cols-[auto_auto_minmax(120px,160px)_minmax(0,1fr)_auto_auto_auto] items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md",
        className
      )}
    >
      {onSelectedChange ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelectedChange(c === true)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span />
      )}

      <div className="flex min-w-[80px] justify-center">{statusBadge}</div>

      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{number}</span>
        {subtitle && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <span className="truncate text-sm font-bold uppercase text-foreground">
          {clientName}
        </span>
        {clientSubtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {clientSubtitle}
          </span>
        )}
      </div>

      <div className="hidden flex-col text-right text-xs sm:flex">
        {issueDate && (
          <>
            <span className="text-muted-foreground">Emitida a</span>
            <span className="font-medium text-foreground">{issueDate}</span>
          </>
        )}
      </div>

      <div className="hidden flex-col text-right text-xs md:flex">
        {dueDate && (
          <>
            <span className="text-muted-foreground">Vence a</span>
            <span
              className={cn(
                "font-medium",
                dueDateTone === "overdue" ? "text-destructive" : "text-foreground"
              )}
            >
              {dueDate}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col text-right">
          <span className="text-base font-bold text-foreground">{totalPrimary}</span>
          {totalSecondary && (
            <span className="text-xs text-muted-foreground">{totalSecondary}</span>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
