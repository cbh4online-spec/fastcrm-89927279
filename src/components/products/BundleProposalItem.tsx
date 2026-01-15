import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Layers, Package, Eye, EyeOff } from "lucide-react";
import { useProductComponents, calculateBundleTotals } from "@/hooks/useProductComponents";
import type { Product, ProductComponent } from "@/types/product";

interface BundleProposalItemProps {
  product: Product;
  quantity: number;
  priceOverride?: number;
  onPriceChange: (price: number) => void;
  onQuantityChange: (qty: number) => void;
  showComponentsToClient?: boolean;
  onToggleShowComponents?: (show: boolean) => void;
}

// Create snapshot of bundle at sale time
export interface BundleSnapshot {
  productId: string;
  productName: string;
  pricingMode: string;
  priceUsed: number;
  costUsed: number;
  marginUsed: number;
  marginPct: number;
  components: BundleComponentSnapshot[];
}

export interface BundleComponentSnapshot {
  productId: string;
  productName: string;
  quantity: number;
  priceUsed: number;
  costUsed: number;
  isOptional: boolean;
}

export function createBundleSnapshot(
  product: Product,
  components: ProductComponent[],
  priceOverride?: number
): BundleSnapshot {
  const totals = calculateBundleTotals(
    components,
    product.bundle_price_mode || "auto",
    priceOverride ?? product.base_price
  );

  return {
    productId: product.id,
    productName: product.name,
    pricingMode: product.bundle_price_mode || "auto",
    priceUsed: priceOverride ?? totals.finalPrice,
    costUsed: totals.totalCost,
    marginUsed: (priceOverride ?? totals.finalPrice) - totals.totalCost,
    marginPct: (priceOverride ?? totals.finalPrice) > 0
      ? (((priceOverride ?? totals.finalPrice) - totals.totalCost) / (priceOverride ?? totals.finalPrice)) * 100
      : 0,
    components: components.map((comp) => ({
      productId: comp.component_product_id,
      productName: comp.component?.name || "",
      quantity: comp.quantity,
      priceUsed: comp.price_override ?? (comp.component?.base_price || 0),
      costUsed: comp.cost_override ?? (comp.component?.direct_cost || 0),
      isOptional: comp.is_optional,
    })),
  };
}

export function BundleProposalItem({
  product,
  quantity,
  priceOverride,
  onPriceChange,
  onQuantityChange,
  showComponentsToClient = false,
  onToggleShowComponents,
}: BundleProposalItemProps) {
  const [expanded, setExpanded] = useState(true);
  const { data: components } = useProductComponents(product.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: product.currency,
    }).format(value);
  };

  const totals = components
    ? calculateBundleTotals(components, product.bundle_price_mode || "auto", product.base_price)
    : null;

  const currentPrice = priceOverride ?? (totals?.finalPrice || product.base_price);
  const currentCost = totals?.totalCost || 0;
  const margin = currentPrice - currentCost;
  const marginPct = currentPrice > 0 ? (margin / currentPrice) * 100 : 0;

  const getMarginColor = (pct: number) => {
    if (pct < 0) return "text-destructive";
    if (pct >= 30) return "text-green-600";
    if (pct >= 15) return "text-yellow-600";
    return "text-destructive";
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{product.name}</p>
            <Badge variant="outline" className="text-xs">Bundle</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">×</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={priceOverride ?? currentPrice}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            className="w-28 text-right"
          />
        </div>
      </div>

      {/* Margin display */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-muted-foreground">Custo: {formatCurrency(currentCost)}</span>
        <span className={`font-medium ${getMarginColor(marginPct)}`}>
          Margem: {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
        </span>
      </div>

      <Separator className="my-3" />

      {/* Components */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              {expanded ? (
                <ChevronDown className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">
                {components?.length || 0} componentes
              </span>
            </Button>
          </CollapsibleTrigger>
          
          {onToggleShowComponents && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleShowComponents(!showComponentsToClient)}
              className="text-xs"
            >
              {showComponentsToClient ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Visível ao cliente
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Oculto ao cliente
                </>
              )}
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-2">
          <div className="space-y-2 pl-4 border-l-2 border-muted">
            {components?.map((comp) => {
              const compPrice = comp.price_override ?? (comp.component?.base_price || 0);
              const compCost = comp.cost_override ?? (comp.component?.direct_cost || 0);
              const compMargin = compPrice - compCost;
              const compMarginPct = compPrice > 0 ? (compMargin / compPrice) * 100 : 0;

              return (
                <div
                  key={comp.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {comp.quantity}× {comp.component?.name}
                    </span>
                    {comp.is_optional && (
                      <Badge variant="secondary" className="text-xs">
                        Opcional
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span>{formatCurrency(compPrice * comp.quantity)}</span>
                    <span className={`ml-2 text-xs ${getMarginColor(compMarginPct)}`}>
                      ({compMarginPct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Total line */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between font-medium">
        <span>Total ({quantity}×)</span>
        <span className="text-lg">{formatCurrency(currentPrice * quantity)}</span>
      </div>
    </Card>
  );
}
