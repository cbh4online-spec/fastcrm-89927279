import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Users, ThumbsUp, BarChart3 } from "lucide-react";
import { useCSATDashboard, type CSATPeriod } from "@/hooks/useCSATDashboard";
import { CSATTrendChart, CSATDistributionChart, CSATByTypeChart, CSATByAgentChart } from "@/components/helpdesk/CSATCharts";
import { CSATWidget } from "@/components/helpdesk/CSATWidget";
import CountUp from "react-countup";
import Skeleton from "react-loading-skeleton";
import TimeAgo from "react-timeago";

const PERIODS: { value: CSATPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o período" },
];

export default function HelpdeskCSAT() {
  const [period, setPeriod] = useState<CSATPeriod>("30d");
  const { data: metrics, isLoading } = useCSATDashboard(period);

  if (isLoading || !metrics) {
    return (
      <DashboardLayout>
      <div className="space-y-6 p-6">
        <Skeleton height={32} width={300} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={100} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={300} />)}
        </div>
      </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Satisfação do Cliente (CSAT)</h1>
          <p className="text-muted-foreground text-sm">Análise de avaliações de satisfação dos tickets</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as CSATPeriod)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
            <Star className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold"><CountUp end={metrics.avgRating} decimals={2} duration={1} /></span>
              <CSATWidget rating={Math.round(metrics.avgRating)} readOnly size="sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><CountUp end={metrics.totalRatings} duration={1} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">% Positivas (4-5★)</CardTitle>
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600"><CountUp end={metrics.positivePercent} decimals={1} duration={1} suffix="%" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.nps >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              <CountUp end={metrics.nps} duration={1} prefix={metrics.nps > 0 ? "+" : ""} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Tendência de Satisfação</CardTitle></CardHeader>
          <CardContent>
            {metrics.trend.length > 0 ? (
              <CSATTrendChart metrics={metrics} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de tendência</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição por Estrela</CardTitle></CardHeader>
          <CardContent>
            <CSATDistributionChart metrics={metrics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Satisfação por Tipo de Ticket</CardTitle></CardHeader>
          <CardContent>
            {metrics.byType.length > 0 ? (
              <CSATByTypeChart metrics={metrics} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados por tipo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Satisfação por Agente</CardTitle></CardHeader>
          <CardContent>
            {metrics.byAgent.length > 0 ? (
              <CSATByAgentChart metrics={metrics} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados por agente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Ratings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Avaliações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.recentRatings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Sem avaliações neste período</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentRatings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.ticket_number}</TableCell>
                    <TableCell><CSATWidget rating={r.satisfaction_rating} readOnly size="sm" /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground"><TimeAgo date={r.updated_at} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
