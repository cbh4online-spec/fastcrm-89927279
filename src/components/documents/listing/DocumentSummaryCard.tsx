import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SummaryItem {
  label: string;
  value: string;
  tone?: "default" | "muted" | "success" | "warning" | "destructive" | "primary";
}

interface DocumentSummaryCardProps {
  /**
   * Itens organizados em fórmula visual.
   * Use separadores ("+" ou "=") entre eles via prop `separators`.
   */
  items: SummaryItem[];
  /** Array com mesmo tamanho de items.length-1, cada entrada "+", "=" ou null. */
  separators?: Array<"+" | "=" | "-" | null>;
  /** Conteúdo extra mostrado em baixo (ex.: Rascunhos / Cancelados). */
  footer?: ReactNode;
  highlight?: boolean;
  className?: string;
}

const toneClasses: Record<NonNullable<SummaryItem["tone"]>, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-emerald-600",
  warning: "text-amber-600",
  destructive: "text-destructive",
  primary: "text-primary",
};

export function DocumentSummaryCard({
  items,
  separators,
  footer,
  highlight = true,
  className,
}: DocumentSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} className="contents">
            <div className="flex min-w-[120px] flex-col items-center text-center">
              <span
                className={cn(
                  "text-xl font-bold leading-tight md:text-2xl",
                  toneClasses[item.tone ?? "default"]
                )}
              >
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            {idx < items.length - 1 && separators?.[idx] && (
              <span className="text-2xl font-light text-muted-foreground/60">
                {separators[idx]}
              </span>
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-dashed border-border pt-3 text-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
