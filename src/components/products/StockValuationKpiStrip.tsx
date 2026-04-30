import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, AlertTriangle, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { useInventoryValuation } from "@/hooks/useInventoryValuation";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

/**
 * KPI compacto de stock valorizado, para embutir no dashboard de produtos.
 * Linka para a página completa /dashboard/stock-valuation.
 */
export function StockValuationKpiStrip() {
  const { summary, isLoading } = useInventoryValuation();

  const items = [
    {
      label: "Stock a custo (FIFO)",
      value: fmt(summary?.total_cost_value || 0),
      icon: <Coins className="h-4 w-4" />,
      hint: `${Math.round(summary?.total_units || 0)} un.`,
    },
    {
      label: "Stock a PVP",
      value: fmt(summary?.total_sale_value || 0),
      icon: <TrendingUp className="h-4 w-4" />,
      hint: `${summary?.total_products || 0} produtos`,
    },
    {
      label: "Margem latente",
      value: fmt(summary?.total_latent_margin || 0),
      icon: <Layers className="h-4 w-4" />,
      hint: `${(summary?.avg_margin_pct || 0).toFixed(1)}% média`,
      accent: (summary?.total_latent_margin || 0) >= 0 ? "text-emerald-600" : "text-destructive",
    },
    {
      label: "Alertas",
      value: `${summary?.zero_stock_count || 0}`,
      icon: <AlertTriangle className="h-4 w-4" />,
      hint: `${summary?.negative_margin_count || 0} margem neg.`,
      accent: (summary?.negative_margin_count || 0) > 0 ? "text-destructive" : undefined,
    },
  ];

  return (
    <Link to="/dashboard/stock-valuation" className="block group">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <Card key={it.label} className="transition-colors group-hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5 text-muted-foreground">
                <span className="text-xs">{it.label}</span>
                {it.icon}
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className={`text-lg font-bold ${it.accent || ""}`}>{it.value}</div>
              )}
              {it.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </Link>
  );
}
