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

  const tiles = [
    { label: "Receita", icon: DollarSign, value: formatCurrency(getRevenueByPeriod()), hint: periodLabels[period] },
    { label: "Vendas", icon: ShoppingCart, value: String(getSalesByPeriod()), hint: periodLabels[period] },
    { label: "Ticket Médio", icon: Target, value: stats?.avg_ticket ? formatCurrency(stats.avg_ticket) : "—" },
    { label: "Margem Média", icon: Percent, value: stats?.avg_margin_pct != null ? `${stats.avg_margin_pct.toFixed(1)}%` : "—" },
    { label: "Comissão Total", icon: TrendingUp, value: stats?.total_commission ? formatCurrency(stats.total_commission) : "—" },
    {
      label: "Taxa Aceitação",
      icon: CheckCircle2,
      value: stats?.acceptance_rate !== undefined ? `${stats.acceptance_rate.toFixed(0)}%` : "—",
      hint: `${stats?.accepted_proposals || 0} de ${stats?.total_proposals || 0}`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period filter — pill segmented */}
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        {(["30d", "90d", "1y"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 h-8 text-xs rounded-full transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* KPI tiles — neutral IX */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.label}</span>
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{t.value}</p>
              {t.hint && <p className="text-[11px] text-muted-foreground mt-1">{t.hint}</p>}
            </div>
          );
        })}
      </div>

      {!stats?.total_sales && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Este produto ainda não tem vendas registadas.
        </p>
      )}
    </div>
  );
}
