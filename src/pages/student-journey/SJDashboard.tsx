import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Play,
  Clock,
  ArrowUpRight,
  CalendarClock,
  UserCheck,
  Percent,
  Plus,
  MessageSquare,
  Sparkles,
  Phone,
} from "lucide-react";
import { useSJDashboardMetrics, useProfiles } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage, DROPOUT_RISK_CONFIG } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { ImportProfilesDialog } from "@/components/student-journey/ImportProfilesDialog";
import { SJCopilotDrawer } from "@/components/student-journey/SJCopilotDrawer";

export default function SJDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useSJDashboardMetrics();
  const { profiles } = useProfiles();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Calculate conversion rate
  const totalLeadsProspects = (metrics?.lifecycleBreakdown?.lead || 0) + (metrics?.lifecycleBreakdown?.prospect || 0);
  const enrolled = (metrics?.lifecycleBreakdown?.enrolled || 0) + (metrics?.lifecycleBreakdown?.active || 0) + (metrics?.lifecycleBreakdown?.completed || 0);
  const conversionRate = totalLeadsProspects + enrolled > 0 ? (enrolled / (totalLeadsProspects + enrolled)) * 100 : 0;

  // Filter at-risk profiles
  const atRiskProfiles = profiles.filter((p) => p.dropout_risk === "high" && !["completed", "churned"].includes(p.lifecycle_stage)).slice(0, 5);

  // Filter upcoming follow-ups
  const upcomingFollowUps = profiles
    .filter((p) => p.next_follow_up_at)
    .sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime())
    .slice(0, 5);

  const kpis = [
    { label: "Total Perfis", value: metrics?.totalProfiles || 0, icon: Users, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Ativos", value: metrics?.activeProfiles || 0, icon: Play, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    { label: "Em Risco (Alto)", value: metrics?.highRiskCount || 0, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
    { label: "Conversão", value: `${conversionRate.toFixed(0)}%`, icon: Percent, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    { label: "Taxa Churn", value: `${(metrics?.churnRate || 0).toFixed(1)}%`, icon: TrendingUp, color: metrics?.churnRate && metrics.churnRate > 10 ? "text-red-600" : "text-amber-600", bgColor: metrics?.churnRate && metrics.churnRate > 10 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30" },
    { label: "Cursos Ativos", value: metrics?.activeCourses || 0, icon: GraduationCap, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  ];

  const stages: LifecycleStage[] = ["lead", "prospect", "enrolled", "active", "completed", "inactive", "churned"];

  const getFollowUpLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return { label: "Atrasado", className: "text-red-600" };
    if (isToday(date)) return { label: "Hoje", className: "text-amber-600" };
    if (isTomorrow(date)) return { label: "Amanhã", className: "text-blue-600" };
    return { label: formatDistanceToNow(date, { locale: pt, addSuffix: true }), className: "text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Student Journey</h1>
          <p className="text-muted-foreground">Visão operacional da jornada de formação</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportProfilesDialog />
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/dashboard/student-journey/profiles?risk=high")}
        >
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Ver em Risco ({metrics?.highRiskCount || 0})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/dashboard/student-journey/profiles?stage=lead")}
        >
          <Users className="h-4 w-4 text-blue-500" />
          Leads ({metrics?.lifecycleBreakdown?.lead || 0})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30"
          onClick={() => setCopilotOpen(true)}
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          Diagnóstico IA
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-2">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", kpi.bgColor)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Distribuição por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stages.map((stage) => {
                const config = LIFECYCLE_STAGE_CONFIG[stage];
                const count = metrics?.lifecycleBreakdown[stage] || 0;
                const total = metrics?.totalProfiles || 1;
                const percentage = (count / total) * 100;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", config.color.replace("text-", "bg-"))} />
                        <span>{config.label}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Profiles */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Perfis em Risco
              </CardTitle>
              <Link to="/dashboard/student-journey/profiles?risk=high">
                <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              {atRiskProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <UserCheck className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum perfil em risco alto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atRiskProfiles.map((profile) => {
                    const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
                    return (
                      <Link key={profile.id} to={`/dashboard/student-journey/profiles/${profile.id}`} className="block">
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-xs font-medium">
                              {profile.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">{profile.email || "Sem email"}</p>
                            </div>
                          </div>
                          <Badge className={cn(stageConfig.bgColor, stageConfig.color, "border-0 text-xs")}>
                            {stageConfig.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-500" />
                Próximos Follow-ups
              </CardTitle>
              <Link to="/dashboard/student-journey/profiles?sort=follow_up">
                <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              {upcomingFollowUps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum follow-up agendado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingFollowUps.map((profile) => {
                    const followUp = getFollowUpLabel(profile.next_follow_up_at!);
                    return (
                      <Link key={profile.id} to={`/dashboard/student-journey/profiles/${profile.id}`} className="block">
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                              {profile.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(profile.next_follow_up_at!), "dd MMM, HH:mm", { locale: pt })}
                              </p>
                            </div>
                          </div>
                          <span className={cn("text-xs font-medium", followUp.className)}>
                            {followUp.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Progresso Médio</p>
              <p className="text-2xl font-bold">{metrics?.averageProgress || 0}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold">{metrics?.completedProfiles || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Turmas Ativas</p>
              <p className="text-2xl font-bold">{metrics?.runningCohorts || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateProfileDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <SJCopilotDrawer open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
