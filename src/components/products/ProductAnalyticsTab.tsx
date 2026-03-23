import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Package,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProductAnalytics, type ProductAnalyticsSummary } from "@/hooks/useProductAnalytics";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export function ProductAnalyticsTab() {
  const { currentWorkspace } = useWorkspace();
  const [daysInactive, setDaysInactive] = useState(90);
  const { data, isLoading, error } = useProductAnalytics(currentWorkspace?.id, daysInactive);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">A calcular analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Sem dados suficientes para análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="proposals">
        <TabsList className="flex-wrap">
          <TabsTrigger value="proposals">
            <TrendingUp className="h-4 w-4 mr-1" />
            Top Propostas
          </TabsTrigger>
          <TabsTrigger value="conversion">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Conversão
          </TabsTrigger>
          <TabsTrigger value="margins">
            <BarChart3 className="h-4 w-4 mr-1" />
            Margens
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-1" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Inativos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Layers className="h-4 w-4 mr-1" />
            Categorias
          </TabsTrigger>
        </TabsList>

        {/* Top em Propostas */}
        <TabsContent value="proposals" className="mt-4 space-y-4">
          <TopProposalsSection data={data.top_in_proposals} />
        </TabsContent>

        {/* Conversão */}
        <TabsContent value="conversion" className="mt-4 space-y-4">
          <ConversionSection data={data.conversion_rates} />
        </TabsContent>

        {/* Margens */}
        <TabsContent value="margins" className="mt-4 space-y-4">
          <MarginsSection data={data.avg_margins} />
        </TabsContent>

        {/* Tendências */}
        <TabsContent value="trends" className="mt-4 space-y-4">
          <TrendsSection data={data.price_trends} />
        </TabsContent>

        {/* Inativos */}
        <TabsContent value="inactive" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Label className="text-sm whitespace-nowrap">Sem atividade há mais de:</Label>
            <Input
              type="number"
              value={daysInactive}
              onChange={(e) => setDaysInactive(parseInt(e.target.value) || 90)}
              className="w-20"
              min={7}
            />
            <span className="text-sm text-muted-foreground">dias</span>
          </div>
          <InactiveSection data={data.inactive_products} />
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <CategoriesSection data={data.top_by_category} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Top Propostas ──────────────────────────────────────────────────────────
function TopProposalsSection({ data }: { data: ProductAnalyticsSummary["top_in_proposals"] }) {
  if (!data.length) return <EmptyState text="Sem dados de propostas" />;

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + "…" : d.name,
    propostas: d.count,
    valor: Math.round(d.total_value),
  }));

  return (
    <>
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Top 10 — Produtos mais incluídos em propostas</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v: number) => v} />
            <Bar dataKey="propostas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="rounded-md border max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Propostas</TableHead>
              <TableHead className="text-right">Qtd Total</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.product_id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.count}</TableCell>
                <TableCell className="text-right">{d.total_qty}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.total_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── Conversão ──────────────────────────────────────────────────────────────
function ConversionSection({ data }: { data: ProductAnalyticsSummary["conversion_rates"] }) {
  if (!data.length) return <EmptyState text="Sem dados de conversão" />;

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.name.length > 18 ? d.name.substring(0, 18) + "…" : d.name,
    taxa: d.conversion_rate,
  }));

  return (
    <>
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Taxa de Conversão — Proposta → Fatura (%)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="taxa" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="rounded-md border max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Propostas</TableHead>
              <TableHead className="text-right">Faturas</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.product_id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.proposals_count}</TableCell>
                <TableCell className="text-right">{d.invoices_count}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      d.conversion_rate >= 50
                        ? "text-green-700 bg-green-100 border-0"
                        : d.conversion_rate >= 25
                        ? "text-amber-700 bg-amber-100 border-0"
                        : "text-red-700 bg-red-100 border-0"
                    }
                  >
                    {d.conversion_rate}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── Margens ────────────────────────────────────────────────────────────────
function MarginsSection({ data }: { data: ProductAnalyticsSummary["avg_margins"] }) {
  if (!data.length) return <EmptyState text="Sem dados de margem" />;

  const chartData = data.slice(0, 12).map((d) => ({
    name: d.name.length > 15 ? d.name.substring(0, 15) + "…" : d.name,
    margem: d.margin_pct,
    custo: d.cost,
    pvp: d.avg_sell_price,
  }));

  return (
    <>
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Margem Realizada vs Custo (Top 12)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === "margem" ? `${v}%` : formatCurrency(v)
              }
            />
            <Legend />
            <Bar dataKey="custo" name="Custo" fill="hsl(var(--chart-4))" />
            <Bar dataKey="pvp" name="PV Médio" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="rounded-md border max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">PV Médio</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Unid. Vendidas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.product_id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.category ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.avg_sell_price)}</TableCell>
                <TableCell className="text-right">
                  <span className={d.margin_pct >= 30 ? "text-green-600" : d.margin_pct >= 10 ? "text-amber-600" : "text-red-600"}>
                    {d.margin_pct}%
                    {d.margin_pct >= 30 ? (
                      <ArrowUpRight className="h-3 w-3 inline ml-0.5" />
                    ) : d.margin_pct < 10 ? (
                      <ArrowDownRight className="h-3 w-3 inline ml-0.5" />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-right">{d.units_sold}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── Tendências ─────────────────────────────────────────────────────────────
function TrendsSection({ data }: { data: ProductAnalyticsSummary["price_trends"] }) {
  if (!data.length) return <EmptyState text="Sem dados de tendência" />;

  const product = data[0]; // Show first product trend
  const chartData = product.trend.map((t) => ({
    month: t.month,
    preço: t.avg_price,
    custo: product.cost,
    volume: t.volume,
  }));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {data.map((p, i) => (
          <Badge key={p.product_id} variant={i === 0 ? "default" : "outline"} className="text-xs">
            {p.name}
          </Badge>
        ))}
      </div>

      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Tendência de Preço — {product.name}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(v: number, name: string) => name === "volume" ? v : formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="preço" name="Preço Médio" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="custo" name="Custo" stroke="hsl(var(--chart-4))" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

// ── Inativos ───────────────────────────────────────────────────────────────
function InactiveSection({ data }: { data: ProductAnalyticsSummary["inactive_products"] }) {
  if (!data.length) return <EmptyState text="Todos os produtos têm atividade recente 🎉" />;

  return (
    <div className="rounded-md border max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Dias Inativo</TableHead>
            <TableHead className="text-right">Preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.product_id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">{d.sku ?? "—"}</TableCell>
              <TableCell className="text-xs">{d.category ?? "—"}</TableCell>
              <TableCell className="text-right">{d.stock_quantity}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={
                    d.days_inactive > 180
                      ? "text-red-700 bg-red-100 border-0"
                      : "text-amber-700 bg-amber-100 border-0"
                  }
                >
                  {d.days_inactive}d
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(d.base_price)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Categorias ─────────────────────────────────────────────────────────────
function CategoriesSection({ data }: { data: ProductAnalyticsSummary["top_by_category"] }) {
  if (!data.length) return <EmptyState text="Sem dados por categoria" />;

  const pieData = data.slice(0, 8).map((d, i) => ({
    name: d.category,
    value: d.total_revenue,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <>
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Receita por Categoria</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {data.map((cat) => (
        <Card key={cat.category} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">{cat.category}</h4>
            <Badge variant="secondary">{formatCurrency(cat.total_revenue)}</Badge>
          </div>
          <div className="space-y-1">
            {cat.products.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate mr-2">{p.name}</span>
                <span className="font-mono text-xs">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
