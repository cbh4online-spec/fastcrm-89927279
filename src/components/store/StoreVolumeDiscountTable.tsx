import { Badge } from "@/components/ui/badge";
import { Check, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VolumeRule {
  minQty: number;
  discount: number; // percentage
  pricePerUnit: number;
}

interface StoreVolumeDiscountTableProps {
  basePrice: number;
  rules: VolumeRule[];
  currentQty: number;
  currency?: string;
}

export function StoreVolumeDiscountTable({
  basePrice,
  rules,
  currentQty,
  currency = "€",
}: StoreVolumeDiscountTableProps) {
  if (!rules.length) return null;

  const sortedRules = [...rules].sort((a, b) => a.minQty - b.minQty);
  const activeRule = sortedRules.filter((r) => currentQty >= r.minQty).pop();
  const nextRule = sortedRules.find((r) => currentQty < r.minQty);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Descontos por quantidade</span>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-xs">
              <th className="text-left px-3 py-2 font-medium">Quantidade</th>
              <th className="text-right px-3 py-2 font-medium">Preço/un.</th>
              <th className="text-right px-3 py-2 font-medium">Desconto</th>
            </tr>
          </thead>
          <tbody>
            <tr className={cn("border-t", !activeRule && "bg-primary/5")}>
              <td className="px-3 py-2 font-medium">1+</td>
              <td className="px-3 py-2 text-right">{currency}{basePrice.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">—</td>
            </tr>
            {sortedRules.map((rule) => {
              const isActive = activeRule === rule;
              return (
                <tr
                  key={rule.minQty}
                  className={cn("border-t transition-colors", isActive && "bg-primary/5")}
                >
                  <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                    {rule.minQty}+
                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">
                    {currency}{rule.pricePerUnit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                      -{rule.discount}%
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nextRule && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Compre mais <span className="font-bold text-foreground">{nextRule.minQty - currentQty}</span> e ganhe{" "}
            <span className="font-bold text-primary">-{nextRule.discount}%</span> de desconto!
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((currentQty / nextRule.minQty) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
