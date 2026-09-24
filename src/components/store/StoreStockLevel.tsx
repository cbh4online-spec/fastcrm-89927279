import { cn } from "@/lib/utils";

export type StockLevel = "high" | "low" | "none";

interface StoreStockLevelProps {
  /** Estado geral do produto (out_of_stock força "sem stock") */
  stockStatus?: string | null;
  /** Quantidade disponível, quando o stock é controlado */
  stockQuantity?: number | null;
  /** Se o produto controla stock */
  trackStock?: boolean | null;
  /** Limite a partir do qual se considera stock abundante */
  highThreshold?: number;
  /** Mostrar a legenda ao lado dos blocos */
  showLabel?: boolean;
  className?: string;
}

const LABELS: Record<StockLevel, string> = {
  high: "Em stock — entrega imediata",
  low: "Últimas unidades",
  none: "Sob encomenda",
};

export function resolveStockLevel(
  stockStatus?: string | null,
  stockQuantity?: number | null,
  trackStock?: boolean | null,
  highThreshold = 5,
): StockLevel {
  if (stockStatus === "out_of_stock") return "none";
  if (trackStock && stockQuantity != null) {
    if (stockQuantity <= 0) return "none";
    return stockQuantity >= highThreshold ? "high" : "low";
  }
  if (stockStatus === "in_stock") return "high";
  if (stockStatus === "low_stock" || stockStatus === "backorder") return "low";
  return "high";
}

export function StoreStockLevel({
  stockStatus,
  stockQuantity,
  trackStock,
  highThreshold = 5,
  showLabel = true,
  className,
}: StoreStockLevelProps) {
  const level = resolveStockLevel(stockStatus, stockQuantity, trackStock, highThreshold);
  const filled = level === "high" ? 3 : level === "low" ? 2 : 0;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label={LABELS[level]}
      title={LABELS[level]}
    >
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-4 rounded-[2px] border",
              i < filled
                ? level === "high"
                  ? "bg-success border-success"
                  : "bg-warning border-warning"
                : "bg-muted border-border",
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-[11px] font-medium",
            level === "high"
              ? "text-success"
              : level === "low"
                ? "text-warning"
                : "text-muted-foreground",
          )}
        >
          {LABELS[level]}
        </span>
      )}
    </div>
  );
}
