import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PackagesList } from "@/components/packages/PackagesList";
import { PackageAlertCard } from "@/components/packages/PackageAlertCard";
import { useAllPackageAlerts } from "@/hooks/usePackageAlerts";
import type { PackageAlert } from "@/types/entitlement";

type ActiveTab = "all" | "active" | "alerts";

const pageTabs = [
  { id: "all", label: "Todos", icon: <Package className="h-4 w-4" /> },
  { id: "active", label: "Ativos", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "alerts", label: "Alertas", icon: <AlertTriangle className="h-4 w-4" /> },
];

export default function PackagesPage() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: alerts = [] } = useAllPackageAlerts();

  // Fetch summary stats
  const { data: stats, isLoading } = useQuery({
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
      const remainingUnits = active.reduce((sum, p) => sum + (p.remaining_units || 0), 0);

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

  // Update tabs with counts
  const tabsWithCounts = useMemo(() => {
    return pageTabs.map(tab => ({
      ...tab,
      count: tab.id === "all" 
        ? stats?.total 
        : tab.id === "active" 
          ? stats?.active 
          : tab.id === "alerts" 
            ? alerts.length 
            : undefined
    }));
  }, [stats, alerts.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["packages-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["client-entitlements"] });
    await queryClient.invalidateQueries({ queryKey: ["package-alerts"] });
    setIsRefreshing(false);
  };

  const handleAlertAction = (action: string, alert: PackageAlert) => {
    // TODO: Implement alert actions
    console.log("Alert action:", action, alert);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Pacotes & Sessões"
          count={stats?.total}
          description="Gerir pacotes de sessões vendidos e acompanhar consumo"
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
        />

        {/* Quick KPIs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.active || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Sessões Restantes</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.remainingUnits || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
              {stats && stats.totalUnits > 0 && (
                <Progress 
                  value={100 - stats.avgProgress} 
                  className="h-1.5 mt-2" 
                />
              )}
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alertas</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{alerts.length}</p>
                  )}
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  alerts.length > 0 ? "bg-yellow-500/10" : "bg-muted"
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${
                    alerts.length > 0 ? "text-yellow-500" : "text-muted-foreground"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar pacotes..."
          onSearchChange={setSearchValue}
          showFilters={false}
          rightActions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        />

        {/* Tab Content */}
        {activeTab === "alerts" ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertas Ativos
                </CardTitle>
                {alerts.length > 0 && (
                  <Badge variant="secondary">{alerts.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {alerts.map((alert, idx) => (
                    <PackageAlertCard
                      key={idx}
                      alert={alert}
                      onAction={handleAlertAction}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum alerta ativo</p>
                  <p className="text-sm mt-1">
                    Os alertas aparecem automaticamente quando há ações necessárias.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {activeTab === "active" ? "Pacotes Ativos" : "Todos os Pacotes"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PackagesList showAlerts={false} />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Quick Alerts */}
              {alerts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Alertas Recentes
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.slice(0, 3).map((alert, idx) => (
                        <PackageAlertCard
                          key={idx}
                          alert={alert}
                          onAction={handleAlertAction}
                        />
                      ))}
                      {alerts.length > 3 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => setActiveTab("alerts")}
                        >
                          Ver todos os {alerts.length} alertas
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tips Card */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    💡 Dica
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Os pacotes são criados automaticamente quando vendes produtos por sessões. 
                    Regista cada sessão para manter o saldo atualizado e receber alertas de renovação.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
