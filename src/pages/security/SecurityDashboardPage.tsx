import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSecurityDashboard } from "@/hooks/security/useSecurityDashboard";
import { useSecurityDashboardCharts } from "@/hooks/security/useSecurityDashboardCharts";
import {
  Shield, FileText, AlertTriangle, Wrench, ClipboardList,
  Building2, Camera, RefreshCw, Plus, ArrowRight, TrendingUp, TrendingDown, Activity,
  Zap, Target, ArrowDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const severityColors: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

const alertTypeIcons: Record<string, any> = {
  maintenance: Wrench,
  occurrence: AlertTriangle,
  request: ClipboardList,
};

export default function SecurityDashboardPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { stats, isLoading } = useSecurityDashboard();
  const { charts, isLoading: chartsLoading } = useSecurityDashboardCharts();

  const kpis = [
    { label: t("pendingValidation"), value: stats?.pendingRequests ?? 0, icon: ClipboardList, color: "text-amber-500", href: "/dashboard/security/partner-requests", trend: null },
    { label: t("kpiCompletedInstallations"), value: stats?.activeSystems ?? 0, icon: Camera, color: "text-emerald-500", href: "/dashboard/security/systems", trend: "up" as const },
    { label: t("kpiOpenOccurrences"), value: stats?.openOccurrences ?? 0, icon: AlertTriangle, color: "text-red-500", href: "/dashboard/security/occurrences", trend: (stats?.openOccurrences ?? 0) > 0 ? "down" as const : null },
    { label: t("contracts"), value: stats?.activeContracts ?? 0, icon: FileText, color: "text-blue-500", href: "/dashboard/security/contracts", trend: null },
    { label: t("kpiDocBacklog"), value: stats?.pendingDocs ?? 0, icon: FileText, color: "text-orange-500", href: "/dashboard/security/documents", trend: null },
    { label: t("kpiMaintenanceOverdue"), value: stats?.overdueMaintenances ?? 0, icon: Wrench, color: "text-purple-500", href: "/dashboard/security/maintenance", trend: (stats?.overdueMaintenances ?? 0) > 0 ? "down" as const : null },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t("moduleTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                Gestão end-to-end de sistemas de segurança eletrónica
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/dashboard/security/partner-requests")} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newPartnerRequest")}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <Card
              key={kpi.label}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(kpi.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{isLoading ? "—" : kpi.value}</p>
                  {kpi.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                  {kpi.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Critical Alerts + Pipeline Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Critical Alerts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-destructive" />
                Alertas Críticos
              </CardTitle>
              <CardDescription>Itens que requerem atenção imediata</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.alerts.length === 0 ? (
                <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                  <Shield className="h-10 w-10 mb-3 text-emerald-500/50" />
                  <p className="text-sm font-medium">Sem alertas críticos</p>
                  <p className="text-xs">Todas as operações estão em dia</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {charts.alerts.map((alert: any) => {
                    const Icon = alertTypeIcons[alert.type] || AlertTriangle;
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(alert.href)}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "high" ? "text-orange-500" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          {alert.subtitle && <p className="text-xs text-muted-foreground truncate">{alert.subtitle}</p>}
                        </div>
                        <Badge variant={(severityColors[alert.severity] || "secondary") as any} className="text-[10px] shrink-0">
                          {alert.severity}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Pipeline Comercial
              </CardTitle>
              <CardDescription>Funil de conversão do módulo</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.pipeline.every((p: any) => p.count === 0) ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <div className="space-y-3">
                  {charts.pipeline.map((stage: any, i: number) => {
                    const maxCount = Math.max(...charts.pipeline.map((p: any) => p.count), 1);
                    const width = Math.max((stage.count / maxCount) * 100, 12);
                    return (
                      <div key={stage.stage} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{stage.label}</span>
                        <div className="flex-1 relative">
                          <div
                            className="h-8 rounded flex items-center justify-center text-xs font-bold transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                              color: "white",
                              opacity: 0.85 + (i * 0.03),
                            }}
                          >
                            {stage.count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Conversion rates */}
                  <div className="pt-3 border-t grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{charts.conversionRates.requestToLead}%</p>
                      <p className="text-[10px] text-muted-foreground">Pedido → Lead</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{charts.conversionRates.leadToProposal}%</p>
                      <p className="text-[10px] text-muted-foreground">Lead → Proposta</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{charts.conversionRates.proposalToContract}%</p>
                      <p className="text-[10px] text-muted-foreground">Proposta → Contrato</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-500">{charts.conversionRates.leadWinRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Occurrences by Severity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ocorrências por Severidade</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.occurrencesBySeverity.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.occurrencesBySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {charts.occurrencesBySeverity.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Systems by Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sistemas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.systemsByType.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.systemsByType}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Contracts Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contratos por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.contractsByStatus.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={charts.contractsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {charts.contractsByStatus.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Maintenance Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Manutenções — Cumprimento
              </CardTitle>
              <CardDescription>Visitas realizadas vs. agendadas (últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.maintenanceCompliance.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.maintenanceCompliance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="scheduled" name="Agendadas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Concluídas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Documents Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Documental</CardTitle>
              <CardDescription>Estado dos documentos técnicos</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">A carregar...</div>
              ) : charts.documentsByStatus.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.documentsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("partnerRequests"), href: "/dashboard/security/partner-requests", icon: ClipboardList },
            { label: t("securityLeads"), href: "/dashboard/security/leads", icon: Target },
            { label: t("proposals"), href: "/dashboard/security/proposals", icon: FileText },
            { label: t("contracts"), href: "/dashboard/security/contracts", icon: FileText },
            { label: t("sites"), href: "/dashboard/security/sites", icon: Building2 },
            { label: t("systems"), href: "/dashboard/security/systems", icon: Camera },
            { label: t("documents"), href: "/dashboard/security/documents", icon: FileText },
            { label: t("maintenance"), href: "/dashboard/security/maintenance", icon: Wrench },
            { label: t("occurrences"), href: "/dashboard/security/occurrences", icon: AlertTriangle },
            { label: t("renewals"), href: "/dashboard/security/renewals", icon: RefreshCw },
            { label: t("catalog"), href: "/dashboard/security/equipment", icon: Camera },
            { label: t("partners"), href: "/dashboard/security/clients", icon: Building2 },
          ].map((item) => (
            <Button
              key={item.href}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5"
              onClick={() => navigate(item.href)}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
