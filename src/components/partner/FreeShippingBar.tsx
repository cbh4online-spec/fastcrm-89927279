import { Progress } from "@/components/ui/progress";
import { Truck, CheckCircle2 } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";

interface Props {
  threshold: number | null;
  remaining: number;
  subtotal: number;
}

export function FreeShippingBar({ threshold, remaining, subtotal }: Props) {
  if (!threshold || threshold <= 0) return null;

  const reached = remaining <= 0;
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {reached ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-700">Frete grátis ativo!</span>
          </>
        ) : (
          <>
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>
              Faltam <strong>{formatMoneyEur(remaining)}</strong> para frete grátis (mín. {formatMoneyEur(threshold)})
            </span>
          </>
        )}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
