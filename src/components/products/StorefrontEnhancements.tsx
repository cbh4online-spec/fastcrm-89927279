import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { applyPricingRules, type PricingRule } from "@/hooks/usePricingRules";

interface StorefrontPriceDisplayProps {
  basePrice: number;
  pricingRules: PricingRule[];
  categoryId?: string;
  quantity?: number;
  formatCurrency: (value: number) => string;
}

/**
 * Mostra preço original riscado + preço final quando há regras de pricing aplicadas
 */
export function StorefrontPriceDisplay({ basePrice, pricingRules, categoryId, quantity, formatCurrency }: StorefrontPriceDisplayProps) {
  const { finalPrice, appliedRule } = useMemo(
    () => applyPricingRules(basePrice, pricingRules, { qty: quantity, categoryId }),
    [basePrice, pricingRules, quantity, categoryId]
  );

  const hasDiscount = finalPrice < basePrice;

  return (
    <div className="flex items-center gap-2">
      {hasDiscount && (
        <span className="text-muted-foreground line-through text-sm">{formatCurrency(basePrice)}</span>
      )}
      <span className={`font-bold ${hasDiscount ? "text-green-600" : ""}`}>{formatCurrency(finalPrice)}</span>
      {appliedRule && (
        <Badge variant="secondary" className="text-xs">
          {appliedRule.discount_type === "percentage" ? `-${appliedRule.discount_value}%` : `-€${appliedRule.discount_value}`}
        </Badge>
      )}
    </div>
  );
}

interface StorefrontBundleBadgeProps {
  isBundle?: boolean;
}

/**
 * Badge "Kit" para produtos que fazem parte de um bundle
 */
export function StorefrontBundleBadge({ isBundle }: StorefrontBundleBadgeProps) {
  if (!isBundle) return null;
  return (
    <Badge variant="default" className="text-xs gap-1">
      <Package className="h-3 w-3" />Kit
    </Badge>
  );
}
