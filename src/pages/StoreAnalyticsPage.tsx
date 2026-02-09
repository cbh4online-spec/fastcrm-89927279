import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreAnalytics } from "@/hooks/useStoreAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, DollarSign, ShoppingBag, Package, Clock,
  ArrowUpRight, ArrowDownRight, Users, Eye, Percent, Tag,
  AlertTriangle, PackageX, BarChart3, ShoppingCart, Layers,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
];

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))"];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function StoreAnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const {
    kpis, dailyRevenue, topProducts, recentOrders,
    customerMetrics, couponMetrics, salesHeatmap,
    inventoryAlerts, statusBreakdown,
  } = useStoreAnalytics(period);

  const kpiData = kpis.data;
  const isLoading = kpis.isLoading;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics da Loja | FastCRM</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics da Loja
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Painel completo de desempenho e vendas</p>
          </div>
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Resumo
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5" /> Vendas
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm">
              <Package className="h-3.5 w-3.5" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5 text-xs sm:text-sm">
              <Tag className="h-3.5 w-3.5" /> Cupões
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="h-3.5 w-3.5" /> Inventário
            </TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW TAB ==================== */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <motion.div {...fadeIn} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KPICard title="Receita" value={kpiData ? `€${kpiData.totalRevenue.toFixed(2)}` : "—"} change={kpiData?.revenueChange} icon={DollarSign} loading={isLoading} />
              <KPICard title="Encomendas" value={kpiData ? String(kpiData.totalOrders) : "—"} change={kpiData?.ordersChange} icon={ShoppingBag} loading={isLoading} />
              <KPICard title="Unidades" value={kpiData ? String(kpiData.totalUnits) : "—"} icon={Package} loading={isLoading} />
              <KPICard title="Ticket Médio" value={kpiData ? `€${kpiData.averageOrderValue.toFixed(2)}` : "—"} icon={ShoppingCart} loading={isLoading} />
              <KPICard title="Conversão" value={kpiData ? `${kpiData.conversionRate.toFixed(1)}%` : "—"} icon={Percent} loading={isLoading} />
              <KPICard title="Clientes" value={kpiData ? String(kpiData.uniqueCustomers) : "—"} icon={Users} loading={isLoading} />
            </motion.div>

            {/* Main Chart: Dual-axis Revenue + Orders */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Receita & Encomendas</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyRevenue.isLoading ? (
                    <Skeleton className="h-[320px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={dailyRevenue.data || []}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "dd/MM")} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis yAxisId="revenue" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={65} />
                        <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={40} />
                        <Tooltip content={<DualTooltip />} />
                        <Legend />
                        <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" />
                        <Line yAxisId="orders" type="monotone" dataKey="orders" name="Encomendas" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Products + Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Top Produtos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topProducts.isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : (topProducts.data || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                    ) : (
                      (topProducts.data || []).slice(0, 5).map((p, i) => (
                        <div key={p.productId + i} className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {i + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.totalQuantity} un. · €{p.totalRevenue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Encomendas Recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecentOrdersTable orders={recentOrders.data || []} isLoading={recentOrders.isLoading} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ==================== SALES TAB ==================== */}
          <TabsContent value="sales" className="space-y-6 mt-6">
            {/* Status Breakdown Stacked */}
            <motion.div {...fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Encomendas por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusBreakdown.isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statusBreakdown.data || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "dd/MM")} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<StatusTooltip />} />
                        <Legend />
                        <Bar dataKey="paid" name="Pago" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="processing" name="Processamento" stackId="a" fill="hsl(var(--info))" />
                        <Bar dataKey="shipped" name="Enviado" stackId="a" fill="hsl(var(--warning))" />
                        <Bar dataKey="delivered" name="Entregue" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Heatmap */}
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mapa de Calor – Vendas por Dia/Hora</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesHeatmap.isLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <SalesHeatmap data={salesHeatmap.data || []} />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Revenue by day of week */}
            <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Receita por Dia da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesHeatmap.isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <WeekdayChart data={salesHeatmap.data || []} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ==================== PRODUCTS TAB ==================== */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <motion.div {...fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance de Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : (topProducts.data || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados de produtos</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Produto</TableHead>
                            <TableHead className="text-right">Unidades</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Conversão</TableHead>
                            <TableHead className="min-w-[120px]">Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(topProducts.data || []).map((p, i) => {
                            const stockPct = p.trackStock ? Math.min(100, ((p.stockQuantity ?? 0) / 50) * 100) : 100;
                            const isLow = p.trackStock && (p.stockQuantity ?? 0) <= 5;
                            const isOut = p.stockStatus === "out_of_stock" || (p.trackStock && (p.stockQuantity ?? 0) <= 0);
                            return (
                              <TableRow key={p.productId + i}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {p.image ? (
                                      <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{p.name}</p>
                                      <div className="flex gap-1 mt-0.5">
                                        {i === 0 && <Badge className="text-[10px] h-4 px-1 bg-warning/10 text-warning border-warning/30" variant="outline">Best Seller</Badge>}
                                        {isOut && <Badge className="text-[10px] h-4 px-1" variant="destructive">Esgotado</Badge>}
                                        {isLow && !isOut && <Badge className="text-[10px] h-4 px-1 bg-warning/10 text-warning border-warning/30" variant="outline">Stock Baixo</Badge>}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{p.totalQuantity}</TableCell>
                                <TableCell className="text-right font-semibold">€{p.totalRevenue.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{p.views || 0}</TableCell>
                                <TableCell className="text-right">
                                  <span className={cn("font-medium", (p.conversionRate ?? 0) > 5 ? "text-success" : "text-muted-foreground")}>
                                    {(p.conversionRate ?? 0).toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {p.trackStock ? (
                                    <div className="flex items-center gap-2">
                                      <Progress value={stockPct} className="h-2 w-16" />
                                      <span className={cn("text-xs font-medium", isOut ? "text-destructive" : isLow ? "text-warning" : "text-muted-foreground")}>
                                        {p.stockQuantity ?? 0}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ==================== CUSTOMERS TAB ==================== */}
          <TabsContent value="customers" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie: New vs Returning */}
              <motion.div {...fadeIn}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Novos vs Recorrentes</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    {customerMetrics.isLoading ? (
                      <Skeleton className="h-[200px] w-[200px] rounded-full" />
                    ) : (
                      <>
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Novos", value: customerMetrics.data?.newCount || 0 },
                                { name: "Recorrentes", value: customerMetrics.data?.returningCount || 0 },
                              ]}
                              cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85}
                              dataKey="value"
                              strokeWidth={2}
                            >
                              {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-6 mt-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            <span>Novos ({customerMetrics.data?.newCount || 0})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-warning" />
                            <span>Recorrentes ({customerMetrics.data?.returningCount || 0})</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top Customers */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Top 10 Clientes por Valor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerMetrics.isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                      </div>
                    ) : (customerMetrics.data?.customers || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead className="text-right">Total Gasto</TableHead>
                              <TableHead className="text-right">Encomendas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(customerMetrics.data?.customers || []).map((c, i) => (
                              <TableRow key={c.email}>
                                <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                                <TableCell>
                                  <p className="font-medium text-sm">{c.name || "—"}</p>
                                  <p className="text-xs text-muted-foreground">{c.email}</p>
                                </TableCell>
                                <TableCell className="text-right font-semibold">€{c.totalSpent.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={c.orderCount > 1 ? "default" : "outline"} className="text-xs">
                                    {c.orderCount}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ==================== COUPONS TAB ==================== */}
          <TabsContent value="coupons" className="space-y-6 mt-6">
            <motion.div {...fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance de Cupões</CardTitle>
                </CardHeader>
                <CardContent>
                  {couponMetrics.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (couponMetrics.data || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum cupão criado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead className="text-right">Utilizações</TableHead>
                            <TableHead className="text-right">Desconto Total</TableHead>
                            <TableHead className="text-right">Receita Gerada</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(couponMetrics.data || []).map(c => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <span className="font-mono font-semibold text-sm bg-muted px-2 py-1 rounded">{c.code}</span>
                              </TableCell>
                              <TableCell>
                                {c.discountType === "percentage" ? `${c.discountValue}%` : `€${c.discountValue.toFixed(2)}`}
                              </TableCell>
                              <TableCell className="text-right font-medium">{c.usedCount}</TableCell>
                              <TableCell className="text-right text-destructive font-medium">-€{c.totalDiscountGiven.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-success font-semibold">€{c.revenueGenerated.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">
                                  {c.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ==================== INVENTORY TAB ==================== */}
          <TabsContent value="inventory" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut: Stock Overview */}
              <motion.div {...fadeIn}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">Visão Geral do Stock</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    {inventoryAlerts.isLoading ? (
                      <Skeleton className="h-[200px] w-[200px] rounded-full" />
                    ) : (
                      <>
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Em Stock", value: inventoryAlerts.data?.inStock || 0 },
                                { name: "Baixo", value: inventoryAlerts.data?.lowStock || 0 },
                                { name: "Esgotado", value: inventoryAlerts.data?.outOfStock || 0 },
                              ]}
                              cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85}
                              dataKey="value"
                              strokeWidth={2}
                            >
                              <Cell fill="hsl(var(--success))" />
                              <Cell fill="hsl(var(--warning))" />
                              <Cell fill="hsl(var(--destructive))" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 mt-4 text-sm flex-wrap justify-center">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-success" />
                            <span>Em Stock ({inventoryAlerts.data?.inStock || 0})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-warning" />
                            <span>Baixo ({inventoryAlerts.data?.lowStock || 0})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-destructive" />
                            <span>Esgotado ({inventoryAlerts.data?.outOfStock || 0})</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Alerts List */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Alertas de Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventoryAlerts.isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : (inventoryAlerts.data?.alerts || []).length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-10 w-10 text-success/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Todos os produtos com stock adequado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(inventoryAlerts.data?.alerts || []).map(a => {
                          const isOut = a.stockStatus === "out_of_stock" || a.stockQuantity <= 0;
                          return (
                            <div key={a.productId} className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border",
                              isOut ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"
                            )}>
                              {a.image ? (
                                <img src={a.image} alt={a.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <PackageX className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{a.name}</p>
                                <p className="text-xs text-muted-foreground">{a.category || "Sem categoria"}</p>
                              </div>
                              <Badge variant={isOut ? "destructive" : "outline"} className={cn("text-xs", !isOut && "border-warning/50 text-warning")}>
                                {isOut ? "Esgotado" : `${a.stockQuantity} un.`}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ========== Sub-Components ==========

function KPICard({ title, value, change, icon: Icon, loading }: {
  title: string; value: string; change?: number;
  icon: React.ComponentType<{ className?: string }>; loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-24" />
        </CardContent>
      </Card>
    );
  }
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        {change !== undefined && (
          <div className={cn("flex items-center gap-0.5 mt-1 text-[11px] font-medium", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DualTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{format(parseISO(d.date), "dd MMM yyyy", { locale: pt })}</p>
      <p className="text-primary font-semibold">Receita: €{d.revenue?.toFixed(2)}</p>
      <p className="text-warning font-medium">Encomendas: {d.orders}</p>
      <p className="text-muted-foreground">Unidades: {d.units}</p>
    </div>
  );
}

function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{format(parseISO(d.date), "dd MMM yyyy", { locale: pt })}</p>
      {d.paid > 0 && <p className="text-primary">Pago: {d.paid}</p>}
      {d.processing > 0 && <p className="text-info">Processamento: {d.processing}</p>}
      {d.shipped > 0 && <p className="text-warning">Enviado: {d.shipped}</p>}
      {d.delivered > 0 && <p className="text-success">Entregue: {d.delivered}</p>}
    </div>
  );
}

function RecentOrdersTable({ orders, isLoading }: { orders: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem encomendas</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Encomenda</th>
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 pr-4 font-medium">Total</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 font-medium">Data</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const st = statusLabels[order.status] || { label: order.status, variant: "outline" as const };
            return (
              <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-3 pr-4 font-mono text-xs">{order.order_number}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{order.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                </td>
                <td className="py-3 pr-4 font-semibold">€{order.total?.toFixed(2)}</td>
                <td className="py-3 pr-4">
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                </td>
                <td className="py-3 text-muted-foreground text-xs">
                  {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: pt })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SalesHeatmap({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const maxCount = Math.max(1, ...data.map(d => d.count));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-[2px]">
          {/* Header */}
          <div />
          {hours.map(h => (
            <div key={h} className="text-[10px] text-center text-muted-foreground font-medium">
              {h}h
            </div>
          ))}

          {/* Rows */}
          {[1, 2, 3, 4, 5, 6, 0].map(day => (
            <>
              <div key={`label-${day}`} className="text-xs text-muted-foreground font-medium flex items-center">
                {DAY_NAMES[day]}
              </div>
              {hours.map(h => {
                const cell = data.find(d => d.day === day && d.hour === h);
                const intensity = cell ? cell.count / maxCount : 0;
                return (
                  <div
                    key={`${day}-${h}`}
                    className="aspect-square rounded-sm transition-colors"
                    style={{
                      backgroundColor: intensity > 0
                        ? `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                        : "hsl(var(--muted))",
                    }}
                    title={`${DAY_NAMES[day]} ${h}h: ${cell?.count || 0} vendas`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekdayChart({ data }: { data: { day: number; revenue: number }[] }) {
  const grouped = [1, 2, 3, 4, 5, 6, 0].map(day => ({
    name: DAY_NAMES[day],
    revenue: data.filter(d => d.day === day).reduce((sum, d) => sum + d.revenue, 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={grouped}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} width={60} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                <p className="font-medium">{payload[0].payload.name}</p>
                <p className="text-primary font-semibold">€{(payload[0].value as number)?.toFixed(2)}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
