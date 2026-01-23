import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Play,
} from "lucide-react";
import { useSJDashboardMetrics } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage } from "@/types/studentJourney";
import { cn } from "@/lib/utils";

export default function SJDashboard() {
  const { data: metrics, isLoading } = useSJDashboardMetrics();

  const kpis = [
    { label: "Total Perfis", value: metrics?.totalProfiles || 0, icon: Users, color: "text-blue-600" },
    { label: "Ativos", value: metrics?.activeProfiles || 0, icon: Play, color: "text-green-600" },
    { label: "Cursos Ativos", value: metrics?.activeCourses || 0, icon: GraduationCap, color: "text-purple-600" },
    { label: "Taxa Churn", value: `${(metrics?.churnRate || 0).toFixed(1)}%`, icon: AlertTriangle, color: metrics?.churnRate && metrics.churnRate > 10 ? "text-red-600" : "text-amber-600" },
  ];

  const stages: LifecycleStage[] = ["lead", "prospect", "enrolled", "active", "completed", "inactive", "churned"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Student Journey</h1>
        <p className="text-muted-foreground">Visão geral da jornada de formação</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center bg-muted", kpi.color)}>
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Distribuição por Etapa</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage) => {
                const config = LIFECYCLE_STAGE_CONFIG[stage];
                const count = metrics?.lifecycleBreakdown[stage] || 0;
                const total = metrics?.totalProfiles || 1;
                const percentage = (count / total) * 100;
                return (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={cn(config.bgColor, config.color, "border-0")}>{config.label}</Badge>
                      <span className="text-sm font-medium">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Progresso Médio</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <div className="text-4xl font-bold">{metrics?.averageProgress || 0}%</div>
            <p className="text-sm text-muted-foreground mt-2">Média de progresso das inscrições ativas</p>
            <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t w-full">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{metrics?.completedProfiles || 0}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{metrics?.highRiskCount || 0}</p>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
