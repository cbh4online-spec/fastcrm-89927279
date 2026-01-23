import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Users,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  TrendingUp,
  Eye,
  Bot,
} from "lucide-react";
import { useSaaSMetrics, useUpcomingRenewals, useAtRiskSubscriptions } from "@/hooks/useSaaSMetrics";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { BillingAssistantDrawer } from "@/components/billing-assistant";

interface RecurringRevenueDashboardProps {
  className?: string;
}

export function RecurringRevenueDashboard({ className }: RecurringRevenueDashboardProps) {
  const navigate = useNavigate();
  const { metrics, isLoading, subscriptions } = useSaaSMetrics();
  const { upcomingRenewals } = useUpcomingRenewals(7);
  const { atRiskSubscriptions } = useAtRiskSubscriptions();
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Generate mock MRR evolution data (in real app, this would come from metrics_snapshots)
  const mrrEvolutionData = useMemo(() => {
    const months = ["Set", "Out", "Nov", "Dez", "Jan", "Fev"];
    const baseValue = metrics.mrr * 0.7;
    
    return months.map((month, index) => ({
      month,
      mrr: Math.round(baseValue + (metrics.mrr - baseValue) * ((index + 1) / months.length)),
    }));
  }, [metrics.mrr]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Main Revenue Metrics
  const mainMetrics = [
    {
      title: "MRR",
      value: formatCurrency(metrics.mrr),
      change: metrics.mrrGrowthRate,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "ARR",
      value: formatCurrency(metrics.arr),
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Novo MRR",
      value: formatCurrency(metrics.newMRR),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Churn MRR",
      value: formatCurrency(metrics.churnedMRR),
      icon: ArrowDownRight,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Net MRR",
      value: formatCurrency(metrics.netMRRChange),
      icon: metrics.netMRRChange >= 0 ? ArrowUpRight : ArrowDownRight,
      color: metrics.netMRRChange >= 0 ? "text-green-600" : "text-red-600",
      bgColor: metrics.netMRRChange >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ];

  // At-risk items: past_due, upcoming renewals within 7 days, payment failures
  const atRiskItems = [
    ...atRiskSubscriptions.map((sub) => ({
      id: sub.id,
      name: sub.company?.name || sub.contact?.name || "—",
      reason: sub.riskFactors.join(", "),
      mrr: sub.mrr_amount,
      score: sub.riskScore,
      type: "risk" as const,
    })),
    ...upcomingRenewals.slice(0, 3).map((sub) => ({
      id: sub.id,
      name: sub.company?.name || sub.contact?.name || "—",
      reason: sub.daysUntilRenewal === 0 ? "Renova hoje" : `Renova em ${sub.daysUntilRenewal} dias`,
      mrr: sub.mrr_amount,
      score: sub.daysUntilRenewal === 0 ? 80 : 50,
      type: "renewal" as const,
    })),
  ].slice(0, 5);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Assistant Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard de Recorrência</h2>
          <p className="text-sm text-muted-foreground">Visão geral de receita recorrente</p>
        </div>
        <Button variant="outline" onClick={() => setAssistantOpen(true)}>
          <Bot className="mr-2 h-4 w-4" />
          Assistente IA
        </Button>
      </div>

      {/* Assistant Drawer */}
      <BillingAssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />

      {/* Main Metrics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {mainMetrics.map((metric) => (
          <Card key={metric.title} className={metric.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
              {metric.change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {metric.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs ${
                      metric.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatPercent(metric.change)} vs mês anterior
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and At-Risk Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* MRR Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolução MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrrEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "MRR"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* At Risk Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Em Risco
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/billing/subscriptions")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent>
            {atRiskItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma subscrição em risco</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            item.type === "risk"
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-600"
                          }
                        >
                          {item.type === "risk" ? "Em Risco" : "Renovação"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.reason}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(item.mrr)}</p>
                      <Progress
                        value={item.score}
                        className="w-16 h-1.5 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Subscrições Ativas</p>
                <p className="text-2xl font-bold">{metrics.activeSubscriptions}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{metrics.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Churn</p>
                <p className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</p>
              </div>
              <Badge
                variant="secondary"
                className={
                  metrics.churnRate <= 3
                    ? "bg-green-50 text-green-600"
                    : metrics.churnRate <= 7
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-red-50 text-red-600"
                }
              >
                {metrics.churnRate <= 3 ? "Excelente" : metrics.churnRate <= 7 ? "Normal" : "Alto"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">LTV Estimado</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.ltvEstimate)}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
