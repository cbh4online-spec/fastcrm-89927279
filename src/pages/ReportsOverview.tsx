import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useExecutiveKPIs,
  useReportAIInsights,
  useScenarioAnalysis,
} from "@/hooks/useForecastsReports";
import { useSalesPerformance } from "@/hooks/useSalesPerformance";
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
  Euro,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  LayoutDashboard,
  Trophy,
  Globe,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 45%)",
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function KPITile({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  emphasis,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof TrendingUp;
  trend?: "up" | "down" | "neutral";
  emphasis?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors",
        href && "hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-bold tracking-tight text-foreground",
          emphasis && "text-primary",
        )}
      >
        {typeof value === "number" ? formatCurrency(value) : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {trend && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs",
            trend === "up" && "text-emerald-600",
            trend === "down" && "text-destructive",
            trend === "neutral" && "text-muted-foreground",
          )}
        >
          {trend === "up" && <TrendingUp className="h-3 w-3" />}
          {trend === "down" && <TrendingDown className="h-3 w-3" />}
          <span>vs mês anterior</span>
        </div>
      )}
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

function DeepDiveCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  href: string;
}) {
  return (
    <Link to={href} className="group block">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const iconMap = {
    warning: AlertTriangle,
    opportunity: Target,
    success: TrendingUp,
    info: Lightbulb,
  };
  const Icon = iconMap[insight.type as keyof typeof iconMap] || Lightbulb;

  const accentMap: Record<string, string> = {
    warning: "text-amber-600",
    opportunity: "text-emerald-600",
    success: "text-primary",
    info: "text-muted-foreground",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", accentMap[insight.type])} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{insight.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
          {insight.explanation && (
            <p className="mt-2 text-[11px] italic text-muted-foreground/80">
              {insight.explanation}
            </p>
          )}
          {insight.suggestion && (
            <p className="mt-2 border-t border-border pt-2 text-[11px] font-medium text-foreground">
              💡 {insight.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsOverview() {
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useExecutiveKPIs();
  const { data: salesData, isLoading: salesLoading } = useSalesPerformance();
  const insights = useReportAIInsights(kpis);
  const scenarios = useScenarioAnalysis(kpis);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Visão Geral
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              KPIs executivos baseados em dados reais de consumo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="rounded-full px-5"
              onClick={() => navigate("/dashboard/reports/dashboards")}
            >
              Dashboards
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/forecasts")}>
                  Previsões
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/sales")}>
                  Performance de vendas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/financial")}>
                  Relatório financeiro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/consumption")}>
                  Consumo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/retention")}>
                  Retenção & churn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/kpis")}>
                  KPIs detalhados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/growth")}>
                  Crescimento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/reports/goals")}>
                  Objetivos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-2xl" />
            ))
          ) : (
            <>
              <KPITile
                label="Receita MTD"
                value={kpis?.realizedRevenueMTD || 0}
                hint="Este mês"
                icon={Euro}
                trend="up"
              />
              <KPITile
                label="Receita YTD"
                value={kpis?.realizedRevenueYTD || 0}
                hint="Este ano"
                icon={Euro}
              />
              <KPITile
                label="Previsão 30d"
                value={kpis?.forecastedRevenue30d || 0}
                hint="Próximos 30 dias"
                icon={TrendingUp}
                emphasis
                href="/dashboard/reports/forecasts"
              />
              <KPITile
                label="Produtos Ativos"
                value={kpis?.activeProducts || 0}
                hint="Em consumo"
                icon={BarChart3}
                href="/dashboard/reports/consumption"
              />
              <KPITile
                label="Clientes em Risco"
                value={kpis?.clientsAtRisk || 0}
                hint={`${kpis?.churnRate.toFixed(1) || 0}% churn`}
                icon={AlertTriangle}
                href="/dashboard/reports/retention"
              />
              <KPITile
                label="Potencial Upsell"
                value={kpis?.upsellPotential || 0}
                hint="Prontos para renovar"
                icon={Target}
                href="/dashboard/reports/financial"
              />
            </>
          )}
        </div>

        {/* Deep dives */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DeepDiveCard
            title="Relatório Financeiro"
            description="Faturação, recebimentos, aging, top clientes/produtos"
            icon={Euro}
            href="/dashboard/reports/financial"
          />
          <DeepDiveCard
            title="Performance de Vendas"
            description="Pipeline, conversões, win rate, velocidade"
            icon={Trophy}
            href="/dashboard/reports/sales"
          />
          <DeepDiveCard
            title="Previsões"
            description="Forecast 30/60/90 dias, cenários"
            icon={TrendingUp}
            href="/dashboard/reports/forecasts"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IXCard title="Receita Ganha por Mês" description="Últimos 12 meses">
            {salesLoading ? (
              <Skeleton className="h-[260px]" />
            ) : !salesData?.wonRevenueByMonth?.length ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sem dados de receita
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesData.wonRevenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </IXCard>

          <IXCard title="Pipeline por Etapa" description="Valor total vs ponderado">
            {salesLoading ? (
              <Skeleton className="h-[260px]" />
            ) : !salesData?.dealForecast?.length ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sem deals ativos
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, salesData.dealForecast.length * 50 + 40)}
              >
                <BarChart
                  data={salesData.dealForecast}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage_name"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "total_value" ? "Total" : "Ponderado",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="total_value" name="total_value" radius={[0, 4, 4, 0]} barSize={14}>
                    {salesData.dealForecast.map((entry, i) => (
                      <Cell key={i} fill={entry.stage_color} fillOpacity={0.25} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="weighted_value"
                    name="weighted_value"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {salesData.dealForecast.map((entry, i) => (
                      <Cell key={i} fill={entry.stage_color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </IXCard>
        </div>

        {/* Sources + Scenarios */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <IXCard title="Fontes de Leads" description="Distribuição por origem">
            {salesLoading ? (
              <Skeleton className="h-[260px]" />
            ) : !salesData?.sourceBreakdown?.length ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                <Globe className="mr-2 h-4 w-4 opacity-50" />
                Sem leads
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={salesData.sourceBreakdown}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ source, percentage }) => `${source} ${percentage}%`}
                  >
                    {salesData.sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </IXCard>

          <IXCard
            title="Cenários “E se…”"
            description="Projeções baseadas em diferentes ações"
          >
            <div className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                scenarios.map((scenario, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {scenario.scenario}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        +{formatCurrency(scenario.revenueImpact)}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {scenario.probability}% probabilidade
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </IXCard>
        </div>

        {/* AI Insights */}
        <IXCard title="Insights da IA" description="Análises baseadas nos seus dados reais">
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">Sem insights disponíveis</p>
              <p className="mt-1 text-xs">
                Os insights melhoram com mais dados de consumo
              </p>
            </div>
          )}
        </IXCard>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DeepDiveCard
            title="Previsões de Receita"
            description="30, 60 e 90 dias"
            icon={TrendingUp}
            href="/dashboard/reports/forecasts"
          />
          <DeepDiveCard
            title="Consumo & Capacidade"
            description="Sessões e produtos"
            icon={BarChart3}
            href="/dashboard/reports/consumption"
          />
          <DeepDiveCard
            title="Retenção & Churn"
            description="Clientes em risco"
            icon={Users}
            href="/dashboard/reports/retention"
          />
          <DeepDiveCard
            title="Dashboards"
            description="Relatórios personalizados"
            icon={LayoutDashboard}
            href="/dashboard/reports/dashboards"
          />
        </div>

        {/* Governance banner */}
        <IXCard>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Métricas governadas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Todos os valores usam definições únicas e consistentes em todo o sistema.
              </p>
              <p className="mt-2 text-[11px] italic text-muted-foreground/80">
                “Previsões baseadas em consumo real, não suposições.”
              </p>
            </div>
          </div>
        </IXCard>
      </div>
    </DashboardLayout>
  );
}
