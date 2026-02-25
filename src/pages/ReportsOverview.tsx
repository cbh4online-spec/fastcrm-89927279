import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  useExecutiveKPIs, 
  useReportAIInsights, 
  useScenarioAnalysis 
} from "@/hooks/useForecastsReports";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  Target, 
  Euro,
  ArrowUpRight,
  Lightbulb,
  BarChart3,
  PieChart,
  Activity,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  highlight,
  href 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: typeof TrendingUp; 
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  href?: string;
}) {
  const content = (
    <Card className={cn(
      "transition-all hover:shadow-md cursor-pointer",
      highlight && "border-primary/50 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={cn(
              "text-2xl font-bold",
              highlight && "text-primary"
            )}>
              {typeof value === 'number' ? formatCurrency(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            trend === 'up' && "text-green-600",
            trend === 'down' && "text-red-600",
            trend === 'neutral' && "text-muted-foreground"
          )}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            <span>vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

function InsightCard({ insight }: { insight: any }) {
  const iconMap = {
    warning: AlertTriangle,
    opportunity: Target,
    success: TrendingUp,
    info: Lightbulb,
  };
  const Icon = iconMap[insight.type as keyof typeof iconMap] || Lightbulb;

  const colorMap = {
    warning: "border-orange-200 bg-orange-50 text-orange-700",
    opportunity: "border-green-200 bg-green-50 text-green-700",
    success: "border-blue-200 bg-blue-50 text-blue-700",
    info: "border-gray-200 bg-gray-50 text-gray-700",
  };

  return (
    <Card className={cn("border", colorMap[insight.type as keyof typeof colorMap])}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{insight.title}</p>
            <p className="text-xs mt-1 opacity-80">{insight.description}</p>
            {insight.explanation && (
              <p className="text-[10px] mt-2 opacity-60 italic">{insight.explanation}</p>
            )}
            {insight.suggestion && (
              <div className="mt-2 pt-2 border-t border-current/10">
                <p className="text-[10px] font-medium">💡 {insight.suggestion}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsOverview() {
  const { data: kpis, isLoading } = useExecutiveKPIs();
  const insights = useReportAIInsights(kpis);
  const scenarios = useScenarioAnalysis(kpis);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Visão Geral</h1>
          <p className="text-muted-foreground">
            KPIs executivos baseados em dados reais de consumo
          </p>
        </div>

        {/* Main KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] rounded-lg" />
            ))
          ) : (
            <>
              <KPICard
                title="Receita MTD"
                value={kpis?.realizedRevenueMTD || 0}
                subtitle="Este mês"
                icon={Euro}
                trend="up"
              />
              <KPICard
                title="Receita YTD"
                value={kpis?.realizedRevenueYTD || 0}
                subtitle="Este ano"
                icon={Euro}
              />
              <KPICard
                title="Previsão 30d"
                value={kpis?.forecastedRevenue30d || 0}
                subtitle="Próximos 30 dias"
                icon={TrendingUp}
                highlight
                href="/dashboard/reports/forecasts"
              />
              <KPICard
                title="Produtos Ativos"
                value={kpis?.activeProducts || 0}
                subtitle="Em consumo"
                icon={BarChart3}
                href="/dashboard/reports/consumption"
              />
              <KPICard
                title="Clientes em Risco"
                value={kpis?.clientsAtRisk || 0}
                subtitle={`${kpis?.churnRate.toFixed(1) || 0}% churn`}
                icon={AlertTriangle}
                highlight={kpis?.clientsAtRisk ? kpis.clientsAtRisk > 0 : false}
                href="/dashboard/reports/retention"
              />
              <KPICard
                title="Potencial Upsell"
                value={kpis?.upsellPotential || 0}
                subtitle="Prontos para renovar"
                icon={Target}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Insights da IA
                </CardTitle>
                <CardDescription>
                  Análises baseadas nos seus dados reais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <Skeleton className="h-20" />
                ) : insights.length > 0 ? (
                  insights.map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem insights disponíveis</p>
                    <p className="text-xs mt-1">
                      Os insights melhoram com mais dados de consumo
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scenario Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  Cenários "E se..."
                </CardTitle>
                <CardDescription>
                  Projeções baseadas em diferentes ações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    <Skeleton className="h-16" />
                  ) : scenarios.map((scenario, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{scenario.scenario}</p>
                        <p className="text-xs text-muted-foreground">{scenario.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          +{formatCurrency(scenario.revenueImpact)}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {scenario.probability}% probabilidade
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Relatórios Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link 
                  to="/dashboard/reports/forecasts"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Previsões de Receita</p>
                    <p className="text-xs text-muted-foreground">30, 60 e 90 dias</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Separator />
                <Link 
                  to="/dashboard/reports/consumption"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Consumo & Capacidade</p>
                    <p className="text-xs text-muted-foreground">Sessões e produtos</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Separator />
                <Link 
                  to="/dashboard/reports/retention"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Users className="w-5 h-5 text-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Retenção & Churn</p>
                    <p className="text-xs text-muted-foreground">Clientes em risco</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Separator />
                <Link 
                  to="/dashboard/reports/dashboards"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dashboards</p>
                    <p className="text-xs text-muted-foreground">Relatórios personalizados</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            {/* Metrics Governance Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Métricas Governadas</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Todos os valores usam definições únicas e consistentes em todo o sistema.
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      "Previsões baseadas em consumo real, não suposições."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
