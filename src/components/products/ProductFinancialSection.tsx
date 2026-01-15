import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, HelpCircle, Percent } from "lucide-react";
import type { Product } from "@/types/product";
import {
  calculateProductMargins,
  getMarginColor,
  getMarginBgColor,
} from "@/types/product";

interface ProductFinancialSectionProps {
  product: Product;
}

export function ProductFinancialSection({ product }: ProductFinancialSectionProps) {
  const margins = calculateProductMargins(product);

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const MarginBar = ({
    label,
    value,
    percentage,
    tooltip,
    target,
  }: {
    label: string;
    value: number;
    percentage: number;
    tooltip: string;
    target?: number | null;
  }) => {
    const colorClass = getMarginColor(percentage, target);
    const bgColorClass = getMarginBgColor(percentage, target);
    const progressValue = Math.min(Math.max(percentage, 0), 100);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span className="text-sm font-medium">{label}</span>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${colorClass}`}>
              {formatCurrency(value, product.currency)}
            </span>
            <Badge variant="outline" className={`${bgColorClass} ${colorClass}`}>
              {percentage >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {percentage.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="relative">
          <Progress
            value={progressValue}
            className="h-2"
          />
          {target && (
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/50"
              style={{ left: `${Math.min(target, 100)}%` }}
              title={`Meta: ${target}%`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Price & Costs Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Preço Base</p>
          <p className="text-xl font-bold">
            {formatCurrency(product.base_price, product.currency)}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Custo Direto</p>
          <p className="text-xl font-semibold">
            {product.direct_cost !== null
              ? formatCurrency(product.direct_cost, product.currency)
              : "-"}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Custo Operacional</p>
          <p className="text-xl font-semibold">
            {product.operational_cost !== null
              ? formatCurrency(product.operational_cost, product.currency)
              : "-"}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Comissão Padrão</p>
          <p className="text-xl font-semibold">
            {product.commission_default !== null
              ? `${product.commission_default}%`
              : "-"}
          </p>
        </Card>
      </div>

      {/* Margins */}
      <Card className="p-4 space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Margens
        </h3>

        <MarginBar
          label="Margem Bruta"
          value={margins.gross_margin_value}
          percentage={margins.gross_margin_pct}
          tooltip="Margem bruta = preço base - custo direto. Indica quanto sobra antes de custos operacionais."
          target={product.target_margin_pct}
        />

        {(product.operational_cost ?? 0) > 0 && (
          <MarginBar
            label="Margem de Contribuição"
            value={margins.contribution_margin_value}
            percentage={margins.contribution_margin_pct}
            tooltip="Margem de contribuição = preço - custos diretos e operacionais. Mostra a contribuição real para o lucro."
          />
        )}

        {product.target_margin_pct && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Margem Alvo</span>
              <Badge variant="secondary">{product.target_margin_pct}%</Badge>
            </div>
            {margins.gross_margin_pct < product.target_margin_pct && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Margem atual está abaixo da meta definida
              </p>
            )}
          </div>
        )}

        {product.tax_rate_estimate_pct && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Imposto Estimado</span>
              <Badge variant="outline">{product.tax_rate_estimate_pct}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Após impostos: ~
              {formatCurrency(
                margins.gross_margin_value * (1 - product.tax_rate_estimate_pct / 100),
                product.currency
              )}
            </p>
          </div>
        )}
      </Card>

      {/* Commission Preview */}
      {product.commission_default && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Simulação de Comissão</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Por venda</p>
              <p className="font-semibold">
                {formatCurrency(
                  product.base_price * (product.commission_default / 100),
                  product.currency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Se vender 10x</p>
              <p className="font-semibold">
                {formatCurrency(
                  product.base_price * 10 * (product.commission_default / 100),
                  product.currency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">% do preço</p>
              <p className="font-semibold">{product.commission_default}%</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
