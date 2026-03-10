import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityManagement } from "@/hooks/security/useSecurityManagement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, TrendingUp, DollarSign, Users, Shield, Target, Clock,
  Wrench, FileDown, RefreshCw, CheckCircle, AlertTriangle, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { useRef, useCallback } from "react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function SecurityManagementPage() {
  const { t } = useTranslation("security");
  const { data, isLoading } = useSecurityManagement();
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`security-management-report-${new Date().toISOString().split("T")[0]}.pdf`);
  }, []);

  const formatCurrency = (val: number) => val >= 1000 ? `€${(val / 1000).toFixed(1)}k` : `€${val.toFixed(0)}`;

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">A carregar dados de gestão...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={reportRef}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t("management")}</h1>
              <p className="text-sm text-muted-foreground">{t("mgmtSubtitle")}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileDown className="h-4 w-4" /> {t("mgmtExportPDF")}
          </Button>
        </div>

        {/* Executive KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard icon={DollarSign} label={t("mgmtTotalValue")} value={formatCurrency(data.totalContractValue)} color="text-emerald-500" />
          <KpiCard icon={FileDown} label={t("mgmtActiveContracts")} value={String(data.totalActiveContracts)} color="text-blue-500" />
          <KpiCard icon={DollarSign} label={t("mgmtAvgContract")} value={formatCurrency(data.avgContractValue)} color="text-indigo-500" />
          <KpiCard icon={Target} label={t("mgmtWinRate")} value={`${data.winRate}%`} color="text-amber-500" />
          <KpiCard icon={RefreshCw} label={t("mgmtRenewalRate")} value={`${data.renewalRate}%`} color="text-cyan-500" />
          <KpiCard icon={Shield} label={t("mgmtSlaCompliance")} value={`${data.slaCompliance}%`} color={data.slaCompliance >= 80 ? "text-emerald-500" : "text-destructive"} />
          <KpiCard icon={Wrench} label={t("mgmtMaintCompliance")} value={`${data.maintenanceCompliance}%`} color={data.maintenanceCompliance >= 80 ? "text-emerald-500" : "text-destructive"} />
          <KpiCard icon={Clock} label={t("mgmtAvgResolution")} value={`${data.occurrenceResolution.avgHours}h`} color="text-purple-500" />
        </div>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> {t("mgmtPipeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data.pipelineSummary.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-2 flex-1">
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold">{stage.count}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{stage.stage}</p>
                    {stage.value > 0 && <p className="text-[10px] text-primary">{formatCurrency(stage.value)}</p>}
                  </div>
                  {i < data.pipelineSummary.length - 1 && (
                    <TrendingUp className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1: Revenue + Contracts by Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("mgmtRevenueOverTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyRevenue.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("mgmtContractsByType")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.contractsByType.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.contractsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Contratos" />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Receita (€)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Systems + Occurrence Resolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("mgmtSystemsDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.systemsByType.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.systemsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {data.systemsByType.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("mgmtOccurrenceKPIs")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{data.occurrenceResolution.totalClosed}</p>
                  <p className="text-xs text-muted-foreground">{t("mgmtResolvedTotal")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.occurrenceResolution.avgHours}h</p>
                  <p className="text-xs text-muted-foreground">{t("mgmtAvgResolution")}</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${data.occurrenceResolution.slaMetPct >= 80 ? "text-emerald-500" : "text-destructive"}`}>
                    {data.occurrenceResolution.slaMetPct}%
                  </p>
                  <p className="text-xs text-muted-foreground">{t("mgmtSlaCompliance")}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{data.renewalRate}%</p>
                  <p className="text-xs text-muted-foreground">{t("mgmtRenewalRate")}</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.maintenanceCompliance}%</p>
                  <p className="text-xs text-muted-foreground">{t("mgmtMaintCompliance")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partner Performance Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("mgmtPartnerPerformance")}
            </CardTitle>
            <CardDescription>{t("mgmtPartnerDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.partnerMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados de parceiros</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 font-medium">{t("partner")}</th>
                      <th className="py-2 font-medium text-center">{t("mgmtRequests")}</th>
                      <th className="py-2 font-medium text-center">Leads</th>
                      <th className="py-2 font-medium text-center">{t("mgmtWon")}</th>
                      <th className="py-2 font-medium text-center">{t("mgmtConvRate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.partnerMetrics.map((p) => (
                      <tr key={p.partnerId} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{p.partnerName}</td>
                        <td className="py-2.5 text-center">{p.totalRequests}</td>
                        <td className="py-2.5 text-center">{p.convertedLeads}</td>
                        <td className="py-2.5 text-center">
                          <Badge variant={p.wonDeals > 0 ? "default" : "secondary"}>{p.wonDeals}</Badge>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={p.conversionRate >= 50 ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                            {p.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
