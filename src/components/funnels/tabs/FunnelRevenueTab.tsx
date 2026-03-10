import { useState } from "react";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  CalendarIcon, Download, CreditCard, ShoppingCart, Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useFunnelSteps, useFunnelStepStats, useFunnelSales } from "@/hooks/useFunnels";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer
} from "recharts";

interface Props {
  funnelId: string;
}

export function FunnelRevenueTab({ funnelId }: Props) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: steps = [] } = useFunnelSteps(funnelId);
  const { data: rawStats = [] } = useFunnelStepStats(funnelId, dateFrom, dateTo);
  const { data: sales = [] } = useFunnelSales(funnelId, dateFrom, dateTo);

  // Aggregate
  const statsByStep: Record<string, Record<string, number>> = {};
  for (const stat of rawStats) {
    if (!statsByStep[stat.step_id]) statsByStep[stat.step_id] = {};
    statsByStep[stat.step_id][stat.event_type] = (statsByStep[stat.step_id][stat.event_type] || 0) + (stat.count || 0);
    if (stat.event_type === "sale") {
      statsByStep[stat.step_id]["sale_amount"] = (statsByStep[stat.step_id]["sale_amount"] || 0) + Number(stat.amount || 0);
    }
  }

  const getStat = (stepId: string, type: string) => statsByStep[stepId]?.[type] || 0;

  const totalRevenue = steps.reduce((sum, s) => sum + getStat(s.id, "sale_amount"), 0);
  const totalSales = steps.reduce((sum, s) => sum + getStat(s.id, "sale"), 0);
  const totalViews = steps.reduce((sum, s) => sum + getStat(s.id, "page_view"), 0);
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const revenuePerVisitor = totalViews > 0 ? totalRevenue / totalViews : 0;
  const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  // Revenue by step chart
  const revenueByStep = steps.map((step) => ({
    name: step.name,
    receita: getStat(step.id, "sale_amount"),
    vendas: getStat(step.id, "sale"),
  })).filter((d) => d.receita > 0 || d.vendas > 0);

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-background">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm min-w-0"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm min-w-0"
          />
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Receita Total</span>
            </div>
            <p className="text-2xl font-bold">€{totalRevenue.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-medium">Vendas</span>
            </div>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-medium">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold">€{avgOrderValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">Conv. Venda</span>
            </div>
            <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Receita por Visitante (EPV)</div>
            <p className="text-xl font-bold">€{revenuePerVisitor.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Com base em {totalViews.toLocaleString()} visitantes
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Transações Recentes</div>
            <p className="text-xl font-bold">{sales.length}</p>
            <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by step chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Receita por Step
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueByStep.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByStep}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <RTooltip formatter={(val: number) => `€${val.toFixed(2)}`} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" name="Receita" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
              Sem receita no período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent sales table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Últimas Vendas</CardTitle>
            <Badge variant="outline" className="text-xs">{sales.length} registos</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Sem vendas no período
                  </TableCell>
                </TableRow>
              ) : (
                sales.slice(0, 10).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{sale.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sale.customer_email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{sale.product_name || "—"}</TableCell>
                    <TableCell className="font-semibold">€{Number(sale.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sale.purchase_date), "dd MMM yyyy", { locale: pt })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
