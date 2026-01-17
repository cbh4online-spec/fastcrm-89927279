import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { useChurnAnalysis, useCohortAnalysis } from "@/hooks/useForecastsReports";
import { 
  Users, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  UserMinus,
  Activity,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  Percent,
  Euro,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHURN_RISK_CONFIG } from "@/types/forecastsReports";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

type ActiveTab = "causes" | "clients" | "cohorts";

export default function ReportsRetention() {
  const queryClient = useQueryClient();
  const { data: churnData, isLoading: churnLoading } = useChurnAnalysis();
  const { data: cohorts, isLoading: cohortsLoading } = useCohortAnalysis();
  const [activeTab, setActiveTab] = useState<ActiveTab>("causes");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = churnLoading || cohortsLoading;

  const COLORS = ['hsl(var(--primary))', 'hsl(40, 90%, 50%)', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

  // Stats
  const stats = useMemo(() => ({
    retentionRate: churnData?.metrics.retentionRate || 0,
    churnRate: churnData?.metrics.churnRate || 0,
    atRiskClients: churnData?.metrics.atRiskClients || 0,
    avgLTV: churnData?.metrics.avgLifetimeValue || 0,
  }), [churnData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["churn-analysis"] }),
      queryClient.invalidateQueries({ queryKey: ["cohort-analysis"] }),
    ]);
    setIsRefreshing(false);
  }, [queryClient]);

  // Page tabs
  const pageTabs = [
    { id: "causes", label: "Causas de Churn" },
    { id: "clients", label: "Clientes em Risco", count: stats.atRiskClients },
    { id: "cohorts", label: "Análise de Cohortes" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Page Header */}
        <PageHeader
          title="Retenção & Churn"
          description="Análise de clientes em risco e causas de abandono"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:border-green-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Retenção</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{stats.retentionRate.toFixed(1)}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "hover:border-destructive/50 transition-colors",
            stats.churnRate > 10 && "border-destructive/50 bg-destructive/5"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Churn</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-destructive">{stats.churnRate.toFixed(1)}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-amber-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Clientes em Risco</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.atRiskClients}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">LTV Médio</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(stats.avgLTV)}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          showFilters={false}
          rightActions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          }
        />

        {/* Tab Content */}
        {activeTab === "causes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Causas</CardTitle>
                <CardDescription>Principais razões de abandono</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={churnData?.causes}
                        dataKey="percentage"
                        nameKey="cause"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ cause, percentage }) => `${cause}: ${percentage}%`}
                      >
                        {churnData?.causes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Causes List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações Sugeridas</CardTitle>
                <CardDescription>Como reduzir cada causa de churn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : (
                  churnData?.causes.map((cause, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{cause.cause}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cause.percentage}%</Badge>
                          <span className="text-xs text-muted-foreground">
                            {cause.affectedClients} clientes
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 mt-2">
                        <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{cause.suggestion}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "clients" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Clientes em Risco de Churn
              </CardTitle>
              <CardDescription>
                Clientes sem interação recente que precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : churnData?.atRiskClients && churnData.atRiskClients.length > 0 ? (
                <div className="space-y-3">
                  {churnData.atRiskClients.slice(0, 10).map((client: any, i: number) => (
                    <div 
                      key={i}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {client.name?.substring(0, 2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Último contacto: {client.last_contact_at 
                            ? new Date(client.last_contact_at).toLocaleDateString('pt-PT')
                            : 'Nunca'
                          }
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-orange-50 text-orange-700 border-orange-200"
                      >
                        Em risco
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum cliente em risco 🎉</p>
                  <p className="text-xs mt-1">
                    Todos os clientes estão com interações recentes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "cohorts" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Análise de Cohortes
              </CardTitle>
              <CardDescription>
                Comportamento de clientes agrupados por mês de início
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : cohorts && cohorts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Cohorte</th>
                        <th className="text-right py-2 px-3">Clientes</th>
                        <th className="text-right py-2 px-3">Conclusão</th>
                        <th className="text-right py-2 px-3">Recompra</th>
                        <th className="text-right py-2 px-3">Receita/Cliente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.slice(0, 6).map((cohort, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-3 font-medium">{cohort.cohortMonth}</td>
                          <td className="py-3 px-3 text-right">{cohort.totalClients}</td>
                          <td className="py-3 px-3 text-right">
                            <Badge 
                              variant="outline"
                              className={cn(
                                cohort.completionRate > 70 && "bg-green-50 text-green-700 border-green-200",
                                cohort.completionRate <= 70 && cohort.completionRate > 40 && "bg-amber-50 text-amber-700 border-amber-200",
                                cohort.completionRate <= 40 && "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              {cohort.completionRate.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {cohort.repurchaseRate.toFixed(0)}%
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {formatCurrency(cohort.revenuePerClient)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Dados insuficientes para cohortes</p>
                  <p className="text-xs mt-1">
                    As cohortes aparecem com mais clientes ao longo do tempo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
