import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, ShoppingBag, ShoppingCart, Eye, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn } from "./AnalyticsChartHelpers";

interface StoreFinancialTabProps {
  checkoutFunnel: { data: any; isLoading: boolean };
  customerLTV: { data: any[] | undefined; isLoading: boolean };
  bundleRevenue: { data: any[] | undefined; isLoading: boolean };
}

export function StoreFinancialTab({ checkoutFunnel, customerLTV, bundleRevenue }: StoreFinancialTabProps) {
  return (
    <div className="space-y-6">
      {/* Checkout Funnel */}
      <motion.div {...fadeIn}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de Conversão & Abandono</CardTitle>
          </CardHeader>
          <CardContent>
            {checkoutFunnel.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : checkoutFunnel.data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Visualizações", value: checkoutFunnel.data.pageViews, icon: Eye, color: "text-primary" },
                    { label: "Carrinho (est.)", value: checkoutFunnel.data.cartAdds, icon: ShoppingCart, color: "text-info" },
                    { label: "Checkouts", value: checkoutFunnel.data.checkoutsStarted, icon: ShoppingBag, color: "text-warning" },
                    { label: "Pagos", value: checkoutFunnel.data.ordersPaid, icon: DollarSign, color: "text-success" },
                  ].map((step) => (
                    <div key={step.label} className="text-center">
                      <div className={cn("mx-auto h-10 w-10 rounded-full flex items-center justify-center bg-muted mb-2")}>
                        <step.icon className={cn("h-5 w-5", step.color)} />
                      </div>
                      <p className="text-2xl font-bold">{step.value}</p>
                      <p className="text-xs text-muted-foreground">{step.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-primary">{checkoutFunnel.data.viewToCartRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">View → Carrinho</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-info">{checkoutFunnel.data.cartToCheckoutRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Carrinho → Checkout</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-success">{checkoutFunnel.data.checkoutToPayRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Checkout → Pagamento</p>
                  </div>
                  <div className="bg-destructive/10 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-destructive">{checkoutFunnel.data.estimatedAbandonmentRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de Abandono</p>
                  </div>
                </div>

                <div className="text-center">
                  <Badge variant="outline" className="text-sm">
                    Conversão Global: {checkoutFunnel.data.overallConversion.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* LTV & Bundle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                LTV por Cliente (Top 20)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerLTV.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (customerLTV.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de clientes</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={(customerLTV.data || []).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickFormatter={(v) => v ? v.split(" ")[0] : "—"} tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 10 }} width={55} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-medium">{d.name || d.email}</p>
                            <p className="text-primary font-semibold">LTV: €{d.estimatedLTV?.toFixed(2)}</p>
                            <p className="text-muted-foreground">Gasto: €{d.totalSpent?.toFixed(2)} · {d.orderCount} encomendas</p>
                            <p className="text-muted-foreground">Freq: {d.purchaseFrequency?.toFixed(1)}/mês</p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="estimatedLTV" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Gasto Total</TableHead>
                          <TableHead className="text-right">Ticket Médio</TableHead>
                          <TableHead className="text-right">Freq/Mês</TableHead>
                          <TableHead className="text-right">LTV (12m)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(customerLTV.data || []).slice(0, 10).map((c: any) => (
                          <TableRow key={c.email}>
                            <TableCell>
                              <p className="font-medium text-sm">{c.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </TableCell>
                            <TableCell className="text-right">€{c.totalSpent.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{c.avgOrderValue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{c.purchaseFrequency.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">€{c.estimatedLTV.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                Receita por Bundle/Combinação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bundleRevenue.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (bundleRevenue.data || []).length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sem encomendas com múltiplos produtos</p>
                  <p className="text-xs text-muted-foreground mt-1">Bundles aparecem quando clientes compram 2+ produtos juntos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(bundleRevenue.data || []).map((b: any, i: number) => (
                    <div key={b.bundleKey} className="border rounded-xl p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-primary/10 text-primary text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <p className="text-sm font-medium truncate">{b.productNames.join(" + ")}</p>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{b.occurrences}× vendido</span>
                            <span>Ticket: €{b.avgValue.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-success whitespace-nowrap ml-2">€{b.totalRevenue.toFixed(2)}</p>
                      </div>
                      <Progress value={Math.min(100, (b.totalRevenue / ((bundleRevenue.data || [])[0]?.totalRevenue || 1)) * 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
