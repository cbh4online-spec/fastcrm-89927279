import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSecurityDashboard } from "@/hooks/security/useSecurityDashboard";
import {
  Shield, FileText, AlertTriangle, Wrench, ClipboardList,
  Building2, Camera, RefreshCw, Plus, ArrowRight
} from "lucide-react";

export default function SecurityDashboardPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { stats, isLoading } = useSecurityDashboard();

  const kpis = [
    { label: t("pendingValidation"), value: stats?.pendingRequests ?? 0, icon: ClipboardList, color: "text-amber-500", href: "/dashboard/security/partner-requests" },
    { label: t("kpiCompletedInstallations"), value: stats?.activeSystems ?? 0, icon: Camera, color: "text-emerald-500", href: "/dashboard/security/systems" },
    { label: t("kpiOpenOccurrences"), value: stats?.openOccurrences ?? 0, icon: AlertTriangle, color: "text-red-500", href: "/dashboard/security/occurrences" },
    { label: t("contracts"), value: stats?.activeContracts ?? 0, icon: FileText, color: "text-blue-500", href: "/dashboard/security/contracts" },
    { label: t("kpiDocBacklog"), value: stats?.pendingDocs ?? 0, icon: FileText, color: "text-orange-500", href: "/dashboard/security/documents" },
    { label: t("kpiMaintenanceOverdue"), value: stats?.overdueMaintenances ?? 0, icon: Wrench, color: "text-purple-500", href: "/dashboard/security/maintenance" },
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
                <p className="text-2xl font-bold">{isLoading ? "—" : kpi.value}</p>
              </CardContent>
            </Card>
          ))}
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
