import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
} from "lucide-react";
import { useSaaSMetrics, useUpcomingRenewals, useAtRiskSubscriptions } from "@/hooks/useSaaSMetrics";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { SUBSCRIPTION_STATUS_CONFIG, BILLING_CYCLE_LABELS } from "@/types/subscription";

interface SaaSMetricsDashboardProps {
  className?: string;
  compact?: boolean;
}

export function SaaSMetricsDashboard({ className, compact = false }: SaaSMetricsDashboardProps) {
  const { metrics, isLoading } = useSaaSMetrics();
  const { upcomingRenewals } = useUpcomingRenewals(14);
  const { atRiskSubscriptions } = useAtRiskSubscriptions();

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
      <div className={`grid gap-4 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"} ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const mainMetrics = [
    {
      title: "MRR",
      value: formatCurrency(metrics.mrr),
      change: metrics.mrrGrowthRate,
      description: "Receita Mensal Recorrente",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "ARR",
      value: formatCurrency(metrics.arr),
      description: "Receita Anual Recorrente",
      icon: Target,
      color: "text-blue-600",
    },
    {
      title: "Subscrições Ativas",
      value: metrics.activeSubscriptions.toString(),
      change: metrics.subscriptionGrowthRate,
      description: `${metrics.totalSubscriptions} total`,
      icon: RefreshCw,
      color: "text-purple-600",
    },
    {
      title: "Clientes",
      value: metrics.totalCustomers.toString(),
      description: `ARPU: ${formatCurrency(metrics.avgRevenuePerCustomer)}`,
      icon: Users,
      color: "text-orange-600",
    },
  ];

  const secondaryMetrics = [
    {
      title: "Novo MRR",
      value: formatCurrency(metrics.newMRR),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "MRR Churned",
      value: formatCurrency(metrics.churnedMRR),
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Net MRR Change",
      value: formatCurrency(metrics.netMRRChange),
      color: metrics.netMRRChange >= 0 ? "text-green-600" : "text-red-600",
      bgColor: metrics.netMRRChange >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "LTV Estimado",
      value: formatCurrency(metrics.ltvEstimate),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Metrics */}
      <div className={`grid gap-4 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        {mainMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-2 mt-1">
                {metric.change !== undefined && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      metric.change >= 0
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {metric.change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {formatPercent(metric.change)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {metric.description}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!compact && (
        <>
          {/* Secondary Metrics */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {secondaryMetrics.map((metric) => (
              <Card key={metric.title} className={metric.bgColor}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                  <p className={`text-xl font-semibold ${metric.color}`}>
                    {metric.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Health Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Churn Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.churnRate.toFixed(1)}%
                  </span>
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
                    {metrics.churnRate <= 3
                      ? "Excelente"
                      : metrics.churnRate <= 7
                      ? "Normal"
                      : "Alto"}
                  </Badge>
                </div>
                <Progress
                  value={Math.min(metrics.churnRate * 10, 100)}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            {/* Retention Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.retentionRate.toFixed(1)}%
                  </span>
                  <Badge
                    variant="secondary"
                    className={
                      metrics.retentionRate >= 95
                        ? "bg-green-50 text-green-600"
                        : metrics.retentionRate >= 90
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                    }
                  >
                    {metrics.retentionRate >= 95
                      ? "Excelente"
                      : metrics.retentionRate >= 90
                      ? "Bom"
                      : "Baixo"}
                  </Badge>
                </div>
                <Progress
                  value={metrics.retentionRate}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            {/* Net Revenue Retention */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">NRR</CardTitle>
                <CardDescription>Net Revenue Retention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.netRevenueRetention.toFixed(0)}%
                  </span>
                  <Badge
                    variant="secondary"
                    className={
                      metrics.netRevenueRetention >= 100
                        ? "bg-green-50 text-green-600"
                        : "bg-yellow-50 text-yellow-600"
                    }
                  >
                    {metrics.netRevenueRetention >= 100 ? "Crescimento" : "Contração"}
                  </Badge>
                </div>
                <Progress
                  value={Math.min(metrics.netRevenueRetention, 150) / 1.5}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Renewals & At Risk */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upcoming Renewals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Próximas Renovações (14 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingRenewals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem renovações nos próximos 14 dias.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingRenewals.slice(0, 5).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sub.contact?.name || sub.company?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(sub.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.daysUntilRenewal === 0
                              ? "Hoje"
                              : `em ${sub.daysUntilRenewal} dias`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* At Risk Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Subscrições em Risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atRiskSubscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma subscrição em risco identificada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {atRiskSubscriptions.slice(0, 5).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {sub.riskFactors.join(", ")}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            sub.riskScore >= 60
                              ? "bg-red-50 text-red-600"
                              : sub.riskScore >= 40
                              ? "bg-orange-50 text-orange-600"
                              : "bg-yellow-50 text-yellow-600"
                          }
                        >
                          {sub.riskScore}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Billing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Resumo de Billing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-yellow-50 p-4">
                  <p className="text-xs text-yellow-600 font-medium">Pendente</p>
                  <p className="text-xl font-bold text-yellow-700">
                    {formatCurrency(metrics.pendingBillingAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-xs text-green-600 font-medium">
                    Pago Este Mês
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(metrics.paidThisMonth)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
