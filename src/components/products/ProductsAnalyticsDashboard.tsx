import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Product } from "@/types/product";

interface Props {
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220 70% 55%)",
  "hsl(150 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 55%)",
  "hsl(0 70% 55%)",
  "hsl(180 50% 45%)",
];

export function ProductsAnalyticsDashboard({ products, formatCurrency }: Props) {
  const [open, setOpen] = useState(false);

  const analytics = useMemo(() => {
    if (!products.length) return null;

    const total = products.length;
    const withPrice = products.filter(p => p.base_price > 0);
    const avgPrice = withPrice.length ? withPrice.reduce((s, p) => s + p.base_price, 0) / withPrice.length : 0;

    const withMargin = products.filter(p => p.base_price > 0 && p.direct_cost && p.direct_cost > 0);
    const avgMargin = withMargin.length
      ? withMargin.reduce((s, p) => s + ((p.base_price - (p.direct_cost ?? 0)) / p.base_price) * 100, 0) / withMargin.length
      : 0;

    const withImage = products.filter(p => p.images && p.images.length > 0).length;
    const withCost = products.filter(p => p.direct_cost && p.direct_cost > 0).length;

    // By category
    const catMap = new Map<string, number>();
    products.forEach(p => {
      const cat = p.category?.trim() || "Sem categoria";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const byCategory = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // By status
    const statusMap = new Map<string, number>();
    products.forEach(p => {
      statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // Top margin
    const topMargin = withMargin
      .map(p => ({
        name: p.name.length > 25 ? p.name.slice(0, 25) + "…" : p.name,
        margin: Math.round(((p.base_price - (p.direct_cost ?? 0)) / p.base_price) * 100),
        price: p.base_price,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    return { total, avgPrice, avgMargin, withImage, withCost, byCategory, byStatus, topMargin };
  }, [products]);

  if (!analytics) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 mb-2 text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Analytics do Catálogo
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total Produtos</p>
            <p className="text-xl font-bold">{analytics.total}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Preço Médio</p>
            <p className="text-xl font-bold">{formatCurrency(analytics.avgPrice)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Margem Média</p>
            <p className="text-xl font-bold">{analytics.avgMargin.toFixed(1)}%</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Com Imagem</p>
            <p className="text-xl font-bold">{Math.round((analytics.withImage / analytics.total) * 100)}%</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Com Custo</p>
            <p className="text-xl font-bold">{Math.round((analytics.withCost / analytics.total) * 100)}%</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* By Category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                    {analytics.byCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v: number) => [v, "Produtos"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1 mt-1">
                {analytics.byCategory.slice(0, 4).map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {c.name} ({c.value})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Por Estado</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Margin */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 Margem</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topMargin} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                  <RTooltip formatter={(v: number) => [`${v}%`, "Margem"]} />
                  <Bar dataKey="margin" fill="hsl(150 60% 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
