import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PackagesList } from "@/components/packages/PackagesList";
import { PackageAlertCard } from "@/components/packages/PackageAlertCard";
import { useAllPackageAlerts } from "@/hooks/usePackageAlerts";
import type { PackageAlert } from "@/types/entitlement";

export default function PackagesPage() {
  const { currentWorkspace } = useWorkspace();
  const [tab, setTab] = useState("all");
  const { data: alerts = [] } = useAllPackageAlerts();

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ["packages-stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("client_entitlements")
        .select("status, total_units, used_units, remaining_units")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      const active = data?.filter((p) => p.status === "active") || [];
      const completed = data?.filter((p) => p.status === "completed") || [];
      const expired = data?.filter((p) => p.status === "expired") || [];

      const totalUnits = active.reduce((sum, p) => sum + p.total_units, 0);
      const usedUnits = active.reduce((sum, p) => sum + p.used_units, 0);
      const remainingUnits = active.reduce((sum, p) => sum + p.remaining_units, 0);

      return {
        total: data?.length || 0,
        active: active.length,
        completed: completed.length,
        expired: expired.length,
        totalUnits,
        usedUnits,
        remainingUnits,
        avgProgress: totalUnits > 0 ? (usedUnits / totalUnits) * 100 : 0,
      };
    },
    enabled: !!currentWorkspace?.id,
  });

  const handleAlertAction = (action: string, alert: PackageAlert) => {
    // TODO: Implement alert actions
    console.log("Alert action:", action, alert);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Pacotes" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Pacotes & Sessões
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerir pacotes de sessões vendidos e acompanhar consumo
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{stats?.active || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessões Restantes</p>
                  <p className="text-2xl font-bold">{stats?.remainingUnits || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas</p>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Todos os Pacotes</CardTitle>
              </CardHeader>
              <CardContent>
                <PackagesList showAlerts={false} />
              </CardContent>
            </Card>
          </div>

          {/* Alerts Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Alertas
                  </CardTitle>
                  {alerts.length > 0 && (
                    <Badge variant="secondary">{alerts.length}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert, idx) => (
                      <PackageAlertCard
                        key={idx}
                        alert={alert}
                        onAction={handleAlertAction}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum alerta ativo</p>
                    <p className="text-xs mt-1">
                      Os alertas aparecem automaticamente quando há ações necessárias.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <h4 className="font-medium text-sm mb-2">💡 Dica</h4>
                <p className="text-xs text-muted-foreground">
                  Os pacotes são criados automaticamente quando vendes produtos por sessões. 
                  Regista cada sessão para manter o saldo atualizado e receber alertas de renovação.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
