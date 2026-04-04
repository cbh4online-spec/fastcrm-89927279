import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle, Clock, TrendingUp, ShieldCheck, ShieldAlert,
} from "lucide-react";
import type { Product } from "@/types/product";

interface CatalogInsightsProps {
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
}

interface CatalogAlert {
  type: "warning" | "info" | "success";
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
}

export function CatalogInsights({ products, formatCurrency }: CatalogInsightsProps) {
  const insights = useMemo(() => {
    if (!products.length) return null;

    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    // Stale prices (>90 days without price update)
    const stalePrice = products.filter(p => {
      const updated = new Date(p.updated_at).getTime();
      return (now - updated) > ninetyDays && p.base_price > 0;
    });

    // Products with 0 revenue potential (no price)
    const zeroPrice = products.filter(p => !p.base_price || p.base_price === 0);

    // Products with excellent margin (>40%)
    const highMargin = products.filter(p => {
      if (!p.base_price || !p.direct_cost || p.base_price === 0) return false;
      return ((p.base_price - p.direct_cost) / p.base_price) * 100 > 40;
    });

    // Catalog health score (0-100)
    const total = products.length;
    const withPrice = products.filter(p => p.base_price > 0).length;
    const withCost = products.filter(p => p.direct_cost && p.direct_cost > 0).length;
    const withImage = products.filter(p => p.images && p.images.length > 0).length;
    const withCategory = products.filter(p => p.category && p.category.trim()).length;
    const withSKU = products.filter(p => p.sku && p.sku.trim()).length;

    const healthScore = Math.round(
      ((withPrice / total) * 25 +
        (withCost / total) * 25 +
        (withImage / total) * 20 +
        (withCategory / total) * 15 +
        (withSKU / total) * 15)
    );

    const alerts: CatalogAlert[] = [];

    if (stalePrice.length > 0) {
      alerts.push({
        type: "warning",
        icon: <Clock className="h-4 w-4" />,
        title: "Preços desatualizados",
        description: `${stalePrice.length} produto${stalePrice.length > 1 ? "s" : ""} sem atualização de preço há mais de 90 dias`,
        count: stalePrice.length,
      });
    }

    if (zeroPrice.length > 0) {
      alerts.push({
        type: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Sem preço definido",
        description: `${zeroPrice.length} produto${zeroPrice.length > 1 ? "s" : ""} sem preço — não podem gerar receita`,
        count: zeroPrice.length,
      });
    }

    if (highMargin.length > 0) {
      alerts.push({
        type: "success",
        icon: <TrendingUp className="h-4 w-4" />,
        title: "Alta margem",
        description: `${highMargin.length} produto${highMargin.length > 1 ? "s" : ""} com margem superior a 40%`,
        count: highMargin.length,
      });
    }

    return { alerts, healthScore, total };
  }, [products]);

  if (!insights || insights.alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {/* Health score */}
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default">
                {insights.healthScore >= 70 ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-yellow-600" />
                )}
                <span className="text-sm font-medium">
                  Saúde do catálogo: <span className={insights.healthScore >= 70 ? "text-green-600" : insights.healthScore >= 40 ? "text-yellow-600" : "text-destructive"}>{insights.healthScore}/100</span>
                </span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${insights.healthScore >= 70 ? "bg-green-500" : insights.healthScore >= 40 ? "bg-yellow-500" : "bg-destructive"}`}
                    style={{ width: `${insights.healthScore}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Score baseado em: preço (25%), custo (25%), imagem (20%), categoria (15%), SKU (15%)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-2">
        {insights.alerts.map((alert, i) => (
          <Card
            key={i}
            className={`px-3 py-2 flex items-center gap-2 text-sm ${
              alert.type === "warning" ? "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20" :
              alert.type === "success" ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" :
              ""
            }`}
          >
            <span className={
              alert.type === "warning" ? "text-yellow-600" :
              alert.type === "success" ? "text-green-600" :
              "text-muted-foreground"
            }>
              {alert.icon}
            </span>
            <span className="text-xs">{alert.title}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{alert.count}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
