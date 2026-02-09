import { Progress } from "@/components/ui/progress";
import { Truck, PartyPopper } from "lucide-react";

interface StoreFreeShippingBarProps {
  subtotal: number;
  threshold?: number;
}

const FREE_SHIPPING_THRESHOLD = 50;

export function StoreFreeShippingBar({ subtotal, threshold = FREE_SHIPPING_THRESHOLD }: StoreFreeShippingBarProps) {
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);
  const achieved = remaining <= 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      {achieved ? (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <PartyPopper className="h-4 w-4" />
          <span>Parabéns! Envio grátis!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 flex-shrink-0" />
          <span>
            Faltam <strong className="text-foreground">€{remaining.toFixed(2)}</strong> para envio grátis!
          </span>
        </div>
      )}
      <Progress value={progress} className="h-2" />
    </div>
  );
}
