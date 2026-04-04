import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, AlertTriangle } from "lucide-react";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(var(--primary))", "hsl(220 70% 55%)", "hsl(150 60% 45%)",
  "hsl(30 80% 55%)", "hsl(280 60% 55%)", "hsl(0 70% 55%)", "hsl(180 50% 45%)", "hsl(var(--accent))",
];

export function ProductReportsTab() {
  const { currentWorkspace } = useWorkspace();
  const { data, isLoading } = useProductAnalytics(currentWorkspace?.id);

  if (isLoading) return <div className="space-y-4 p-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}</div>;
  if (!data) return <p className="text-center text-muted-foreground py-8">Sem dados de analytics disponíveis</p>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Produtos em Propostas" value={data.top_in_proposals?.length || 0} icon={<Package className="h-4 w-4" />} />
        <KPICard
          title="Taxa Conversão Média"
          value={data.conversion_rates?.length ? `${(data.conversion_rates.reduce((s, c) => s + c.conversion_rate, 0) / data.conversion_rates.length).toFixed(0)}%` : "0%"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          title="Margem Média"
          value={data.avg_margins?.length ? `${(data.avg_margins.reduce((s, m) => s + m.margin_pct, 0) / data.avg_margins.length).toFixed(1)}%` : "0%"}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard title="Produtos Inativos" value={data.inactive_products?.length || 0} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        {data.top_in_proposals?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4" />Top Produtos em Propostas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.top_in_proposals.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Valor"]} />
                  <Bar dataKey="total_value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Margins by Category */}
        {data.avg_margins?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Margem por Produto</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.avg_margins.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis unit="%" />
                  <RTooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Margem"]} />
                  <Bar dataKey="margin_pct" fill="hsl(150 60% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Category */}
        {data.top_by_category?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Receita por Categoria</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.top_by_category} dataKey="total_revenue" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.top_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Receita"]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Price Trends */}
        {data.price_trends?.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tendências de Preço</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={flattenTrends(data.price_trends.slice(0, 4))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  {data.price_trends.slice(0, 4).map((p, i) => (
                    <Line key={p.product_id} type="monotone" dataKey={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversion Rates Table */}
      {data.conversion_rates?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Taxas de Conversão (Proposta → Fatura)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.conversion_rates.slice(0, 10).map(c => (
                <div key={c.product_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{c.proposals_count} prop. → {c.invoices_count} fat.</span>
                    <Badge variant={c.conversion_rate >= 50 ? "default" : c.conversion_rate >= 25 ? "secondary" : "outline"}>
                      {c.conversion_rate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive Products */}
      {data.inactive_products?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Produtos Inativos ({data.inactive_products.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.inactive_products.slice(0, 10).map(p => (
                <div key={p.product_id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.sku && <span className="text-muted-foreground ml-2">({p.sku})</span>}
                  </div>
                  <Badge variant="outline">{p.days_inactive} dias inativo</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, icon, variant }: { title: string; value: string | number; icon: React.ReactNode; variant?: "warning" }) {
  return (
    <Card className={variant === "warning" ? "border-amber-500/30" : ""}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function flattenTrends(trends: Array<{ product_id: string; name: string; trend: Array<{ month: string; avg_price: number }> }>) {
  const months = new Map<string, Record<string, any>>();
  for (const t of trends) {
    for (const point of t.trend) {
      if (!months.has(point.month)) months.set(point.month, { month: point.month });
      months.get(point.month)![t.name] = point.avg_price;
    }
  }
  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
}
