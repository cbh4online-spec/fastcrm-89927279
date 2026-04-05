import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, ShieldX, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { useProducts } from "@/hooks/useProducts";
import {
  usePricingRules,
  getMarginStatus,
  type PricingRule,
} from "@/hooks/useProductPricingIntelligence";
import type { Product } from "@/types/product";

function computeStats(products: Product[], rules: PricingRule[]) {
  let healthy = 0, warning = 0, danger = 0, unknown = 0;
  let totalMargin = 0, marginCount = 0;
  let revenueAtRisk = 0;

  const productMargins: Array<{ product: Product; margin: number; status: string }> = [];

  for (const p of products) {
    if (p.status !== "active") continue;
    const { status, currentMargin } = getMarginStatus(p.base_price, p.direct_cost, rules, p.category);
    if (status === "healthy") healthy++;
    else if (status === "warning") warning++;
    else if (status === "danger") danger++;
    else unknown++;

    if (currentMargin !== null) {
      totalMargin += currentMargin;
      marginCount++;
      productMargins.push({ product: p, margin: currentMargin, status });
      if (status === "danger" && p.base_price) {
        revenueAtRisk += p.base_price;
      }
    }
  }

  const avgMargin = marginCount > 0 ? totalMargin / marginCount : 0;
  const worst10 = productMargins.sort((a, b) => a.margin - b.margin).slice(0, 10);

  // Category distribution
  const catMap = new Map<string, { count: number; totalMargin: number }>();
  for (const pm of productMargins) {
    const cat = pm.product.category || "Sem categoria";
    const entry = catMap.get(cat) || { count: 0, totalMargin: 0 };
    entry.count++;
    entry.totalMargin += pm.margin;
    catMap.set(cat, entry);
  }
  const categoryData = Array.from(catMap.entries())
    .map(([name, { count, totalMargin }]) => ({
      name: name.length > 15 ? name.slice(0, 14) + "…" : name,
      avgMargin: Math.round(totalMargin / count * 10) / 10,
    }))
    .sort((a, b) => a.avgMargin - b.avgMargin);

  return { healthy, warning, danger, unknown, avgMargin, revenueAtRisk, worst10, categoryData };
}

export function PricingHealthDashboard() {
  const { data: products = [] } = useProducts();
  const { data: rules = [] } = usePricingRules();

  const stats = useMemo(() => computeStats(products, rules), [products, rules]);
  const total = stats.healthy + stats.warning + stats.danger;
  const healthyPct = total > 0 ? Math.round((stats.healthy / total) * 100) : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Saudáveis</span>
            </div>
            <p className="text-2xl font-bold mt-1">{healthyPct}%</p>
            <p className="text-xs text-muted-foreground">{stats.healthy} de {total} produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Margem Baixa</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.warning}</p>
            <p className="text-xs text-muted-foreground">abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-4 w-4" />
              <span className="text-xs font-medium">Margem Negativa</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.danger}</p>
            <p className="text-xs text-muted-foreground">vendendo abaixo do custo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Margem Média</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgMargin.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              Risco: {formatCurrency(stats.revenueAtRisk)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Worst 10 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Margem Média por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 80, right: 16, top: 8, bottom: 8 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={75} />
                  <RechartsTooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="avgMargin" radius={[0, 4, 4, 0]}>
                    {stats.categoryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.avgMargin < 0 ? "hsl(var(--destructive))" : entry.avgMargin < 15 ? "hsl(45, 93%, 47%)" : "hsl(142, 71%, 45%)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de margem para apresentar</p>
            )}
          </CardContent>
        </Card>

        {/* Worst 10 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Top 10 — Pior Margem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.worst10.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.worst10.map(({ product, margin, status }) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-sm truncate max-w-[180px]">{product.name}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {margin.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={status === "danger" ? "destructive" : status === "warning" ? "secondary" : "default"}
                          className="text-[10px]"
                        >
                          {status === "danger" ? "Negativa" : status === "warning" ? "Baixa" : "OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
