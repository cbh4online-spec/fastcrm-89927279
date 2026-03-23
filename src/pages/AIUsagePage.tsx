import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAIUsageDashboard, useRecentAILogs } from "@/hooks/useAISettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatFeatureName, formatTokenCount } from "@/types/ai-settings";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  ArrowLeft, BarChart3, Cpu, DollarSign, Zap, AlertTriangle,
  CheckCircle2, XCircle, Settings,
} from "lucide-react";
import { format } from "date-fns";

export default function AIUsagePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { data: dashboard, isLoading } = useAIUsageDashboard(period);
  const { data: recentLogs } = useRecentAILogs(50);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">A carregar dados de utilização...</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalTokens = dashboard?.total_tokens ?? 0;
  const totalCost = dashboard?.total_cost_usd ?? 0;
  const totalCalls = dashboard?.total_calls ?? 0;
  const errorRate = dashboard?.error_rate ?? 0;
  const budgetPct = dashboard?.budget_used_percent;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/ai-settings")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Utilização de IA
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitorização detalhada de chamadas, tokens e custos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="7d">7 dias</TabsTrigger>
                <TabsTrigger value="30d">30 dias</TabsTrigger>
                <TabsTrigger value="90d">90 dias</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => navigate("/dashboard/ai-settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Cpu className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Tokens</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatTokenCount(totalTokens)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Custo Estimado</span>
              </div>
              <p className="text-2xl font-bold text-foreground">~${totalCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Chamadas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalCalls.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Taxa de Erro</span>
              </div>
              <p className={`text-2xl font-bold ${errorRate > 0.05 ? "text-destructive" : errorRate > 0.02 ? "text-yellow-500" : "text-green-500"}`}>
                {(errorRate * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Card */}
        {budgetPct !== null && (
          <Card className={budgetPct > 90 ? "border-destructive/50" : budgetPct > 80 ? "border-yellow-500/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Orçamento Mensal</span>
                <Badge variant={budgetPct > 90 ? "destructive" : budgetPct > 80 ? "secondary" : "outline"}>
                  {budgetPct}%
                </Badge>
              </div>
              <Progress value={budgetPct} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Diária</CardTitle>
            <CardDescription>Tokens e custo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.daily_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      try { return format(new Date(v), "dd/MM"); } catch { return v; }
                    }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="tokens"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => formatTokenCount(v)}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="cost"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelFormatter={(v) => {
                      try { return format(new Date(v), "dd/MM/yyyy"); } catch { return v; }
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "tokens_total") return [formatTokenCount(value), "Tokens"];
                      if (name === "cost_usd") return [`$${value.toFixed(4)}`, "Custo"];
                      return [value, name];
                    }}
                  />
                  <Area
                    yAxisId="tokens"
                    type="monotone"
                    dataKey="tokens_total"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="cost_usd"
                    stroke="hsl(var(--accent-foreground))"
                    fill="hsl(var(--accent) / 0.1)"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Usage by Feature Table */}
        <Card>
          <CardHeader>
            <CardTitle>Utilização por Funcionalidade</CardTitle>
            <CardDescription>Detalhamento de chamadas, tokens e custos por módulo de IA</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionalidade</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Taxa Erro</TableHead>
                  <TableHead className="text-right">Latência Média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard?.summary_by_feature ?? []).map((row) => {
                  const errRate = Number(row.call_count) > 0 ? Number(row.error_count) / Number(row.call_count) : 0;
                  return (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{formatFeatureName(row.feature)}</TableCell>
                      <TableCell className="text-right">{Number(row.call_count).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatTokenCount(Number(row.tokens_total))}</TableCell>
                      <TableCell className="text-right">~${Number(row.cost_usd_total).toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={errRate > 0.05 ? "destructive" : errRate > 0.02 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {(errRate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avg_latency_ms ? `${Math.round(Number(row.avg_latency_ms))}ms` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(dashboard?.summary_by_feature ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sem dados de utilização para este período
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Calls Log */}
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Recentes</CardTitle>
            <CardDescription>Últimas 50 chamadas de IA</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionalidade</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Latência</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentLogs ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">{formatFeatureName(log.feature)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.model}</TableCell>
                      <TableCell className="text-right text-sm">{formatTokenCount(log.tokens_total)}</TableCell>
                      <TableCell className="text-right text-sm">~${Number(log.cost_usd).toFixed(4)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {log.latency_ms ? `${log.latency_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.was_error ? (
                          <XCircle className="h-4 w-4 text-destructive inline-block" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 inline-block" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(recentLogs ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Sem chamadas registadas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
