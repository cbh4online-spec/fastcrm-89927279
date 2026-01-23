import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Play,
  CheckCircle2,
  UserX,
  UserPlus,
} from "lucide-react";
import { useSJDashboardMetrics } from "@/hooks/useStudentJourney";
import { STUDENT_STAGE_CONFIG, StudentStage } from "@/types/studentJourney";
import { cn } from "@/lib/utils";

export default function SJDashboard() {
  const { data: metrics, isLoading } = useSJDashboardMetrics();

  const kpis = [
    {
      label: "Total Alunos",
      value: metrics?.totalStudents || 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Alunos Ativos",
      value: metrics?.activeStudents || 0,
      icon: Play,
      color: "text-green-600",
    },
    {
      label: "Turmas Ativas",
      value: metrics?.activeCohorts || 0,
      icon: GraduationCap,
      color: "text-purple-600",
    },
    {
      label: "Taxa de Churn",
      value: `${(metrics?.churnRate || 0).toFixed(1)}%`,
      icon: AlertTriangle,
      color: metrics?.churnRate && metrics.churnRate > 10 ? "text-red-600" : "text-amber-600",
    },
  ];

  const stages: StudentStage[] = [
    "lead",
    "inscrito",
    "ativo",
    "concluido",
    "inativo",
    "churn",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard Student Journey
        </h1>
        <p className="text-muted-foreground">
          Visão geral da jornada de formação dos seus alunos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center bg-muted",
                    kpi.color
                  )}
                >
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Breakdown & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage) => {
                const config = STUDENT_STAGE_CONFIG[stage];
                const count = metrics?.stageBreakdown[stage] || 0;
                const total = metrics?.totalStudents || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(config.bgColor, config.color, "border-0")}>
                          {config.label}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Average Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative h-40 w-40">
                <svg className="h-40 w-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(metrics?.averageProgress || 0) * 4.4} 440`}
                    className="text-primary transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">
                    {metrics?.averageProgress || 0}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Média de progresso das inscrições ativas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {metrics?.completedStudents || 0}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {metrics?.stageBreakdown.churn || 0}
                </p>
                <p className="text-sm text-muted-foreground">Churn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
