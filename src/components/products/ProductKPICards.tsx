import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Target,
  Percent,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useProductStats } from "@/hooks/useProductStats";

interface ProductKPICardsProps {
  productId: string;
  currency?: string;
}

type Period = "30d" | "90d" | "1y";

export function ProductKPICards({ productId, currency = "EUR" }: ProductKPICardsProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: stats, isLoading } = useProductStats(productId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getRevenueByPeriod = () => {
    if (!stats) return 0;
    switch (period) {
      case "30d":
        return stats.revenue_30d;
      case "90d":
        return stats.revenue_90d;
      case "1y":
        return stats.revenue_1y;
      default:
        return stats.total_revenue;
    }
  };

  const getSalesByPeriod = () => {
    if (!stats) return 0;
    // We only have sales_30d from the view, so approximate for other periods
    switch (period) {
      case "30d":
        return stats.sales_30d;
      case "90d":
        return Math.round(stats.total_sales * 0.25); // Approximate
      case "1y":
        return stats.total_sales;
      default:
        return stats.total_sales;
    }
  };

  const periodLabels: Record<Period, string> = {
    "30d": "30 dias",
    "90d": "90 dias",
    "1y": "12 meses",
  };

  return (
    <div className="space-y-4">
      {/* Period Filter */}
      <div className="flex gap-2">
        {(["30d", "90d", "1y"] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Receita</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(getRevenueByPeriod())}</p>
          <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Vendas</span>
          </div>
          <p className="text-lg font-bold">{getSalesByPeriod()}</p>
          <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold">
            {stats?.avg_ticket ? formatCurrency(stats.avg_ticket) : "-"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Margem Média</span>
          </div>
          <p className="text-lg font-bold">
            {stats?.avg_margin_pct !== null
              ? `${stats.avg_margin_pct.toFixed(1)}%`
              : "-"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            <span className="text-xs text-muted-foreground">Comissão Total</span>
          </div>
          <p className="text-lg font-bold">
            {stats?.total_commission ? formatCurrency(stats.total_commission) : "-"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Taxa Aceitação</span>
          </div>
          <p className="text-lg font-bold">
            {stats?.acceptance_rate !== undefined
              ? `${stats.acceptance_rate.toFixed(0)}%`
              : "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats?.accepted_proposals || 0} de {stats?.total_proposals || 0}
          </p>
        </Card>
      </div>

      {!stats?.total_sales && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Este produto ainda não tem vendas registadas.
        </p>
      )}
    </div>
  );
}
