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
  Building2, Camera, RefreshCw, Plus, ArrowRight, TrendingUp, TrendingDown, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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
            { label: t("sites"), href: "/dashboard/security/sites", icon: Building2 },
            { label: t("systems"), href: "/dashboard/security/systems", icon: Camera },
            { label: t("documents"), href: "/dashboard/security/documents", icon: FileText },
            { label: t("maintenance"), href: "/dashboard/security/maintenance", icon: Wrench },
            { label: t("occurrences"), href: "/dashboard/security/occurrences", icon: AlertTriangle },
            { label: t("renewals"), href: "/dashboard/security/renewals", icon: RefreshCw },
            { label: t("catalog"), href: "/dashboard/security/equipment", icon: Camera },
          ].map((item) => (
            <Button
              key={item.href}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate(item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
