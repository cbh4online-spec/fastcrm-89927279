import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAccountBriefKPIs, KPI_LABELS } from "@/hooks/useAccountBriefKPIs";

export default function AccountBriefKPIsPage() {
  const { kpis, isLoading } = useAccountBriefKPIs();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="KPIs do Módulo"
            description="Métricas de performance e utilização do Account Brief"
          />

          {kpis.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  Ainda sem snapshots de KPIs. Os dados serão recolhidos automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.metric_key} className="border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-medium">
                      {KPI_LABELS[kpi.metric_key] || kpi.metric_key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold">
                        {kpi.metric_key.includes("rate")
                          ? `${kpi.metric_value.toFixed(1)}%`
                          : kpi.metric_key.includes("hours")
                          ? `${kpi.metric_value.toFixed(1)}h`
                          : kpi.metric_value}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {kpi.snapshot_date}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
