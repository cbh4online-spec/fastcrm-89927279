import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPITone = "neutral" | "success" | "warning" | "danger" | "primary";

export interface ListKPI {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: KPITone;
  onClick?: () => void;
  active?: boolean;
}

const VALUE_TONE: Record<KPITone, string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground dark:text-warning",
  danger: "text-destructive",
};

const ICON_TONE: Record<KPITone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground dark:text-warning",
  danger: "bg-destructive/10 text-destructive",
};

interface ListKPIStripProps {
  items: ListKPI[];
  isLoading?: boolean;
  /** Nota curta apresentada por baixo (ex.: reflete os filtros ativos). */
  note?: string;
  className?: string;
}

/**
 * Faixa de KPIs para listagens IX: cards planos, sem gradientes,
 * com scroll horizontal em ecrãs estreitos.
 */
export function ListKPIStrip({ items, isLoading, note, className }: ListKPIStripProps) {
  if (isLoading) {
    return (
      <div className={cn("mb-4 flex gap-3 overflow-x-auto pb-1", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] min-w-[168px] flex-1 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={cn("mb-4", className)}>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((kpi) => {
          const tone = kpi.tone ?? "neutral";
          const Icon = kpi.icon;
          const interactive = typeof kpi.onClick === "function";
          const Tag = interactive ? "button" : "div";
          return (
            <Tag
              key={kpi.key}
              {...(interactive ? { type: "button" as const, onClick: kpi.onClick } : {})}
              className={cn(
                "flex min-w-[168px] flex-1 items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition-colors",
                kpi.active ? "border-primary ring-1 ring-primary/30" : "border-border",
                interactive && "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-pressed={interactive ? !!kpi.active : undefined}
            >
              {Icon && (
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", ICON_TONE[tone])}>
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <span className={cn("block truncate text-xl font-bold leading-tight", VALUE_TONE[tone])}>
                  {kpi.value}
                </span>
                {kpi.hint && (
                  <span className="block truncate text-[11px] text-muted-foreground">{kpi.hint}</span>
                )}
              </span>
            </Tag>
          );
        })}
      </div>
      {note && <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
