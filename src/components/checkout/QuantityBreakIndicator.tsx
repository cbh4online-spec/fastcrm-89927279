import { Badge } from "@/components/ui/badge";

interface QuantityBreakIndicatorProps {
  breaks: { min_quantity: number; discount_percentage: number; label?: string }[];
  currentQuantity: number;
  currency?: string;
  unitPrice?: number;
}

export function QuantityBreakIndicator({ breaks, currentQuantity, currency = "EUR", unitPrice }: QuantityBreakIndicatorProps) {
  if (!breaks.length) return null;

  const sorted = [...breaks].sort((a, b) => a.min_quantity - b.min_quantity);
  const activeBreak = sorted.filter((b) => currentQuantity >= b.min_quantity).pop();
  const nextBreak = sorted.find((b) => currentQuantity < b.min_quantity);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-semibold">Descontos por Quantidade</p>
      <div className="space-y-1.5">
        {sorted.map((b) => {
          const isActive = activeBreak?.min_quantity === b.min_quantity;
          return (
            <div key={b.min_quantity} className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${isActive ? "bg-primary/10 font-medium" : ""}`}>
              <span>{b.label || `${b.min_quantity}+ unidades`}</span>
              <Badge variant={isActive ? "default" : "outline"}>-{b.discount_percentage}%</Badge>
            </div>
          );
        })}
      </div>
      {nextBreak && (
        <p className="text-xs text-muted-foreground">
          Adiciona mais {nextBreak.min_quantity - currentQuantity} para poupar {nextBreak.discount_percentage}%!
        </p>
      )}
    </div>
  );
}
