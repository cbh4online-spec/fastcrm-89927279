import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Plus,
  GraduationCap,
  Users,
  Clock,
  Settings,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { useCohort, useEnrollments } from "@/hooks/useStudentJourney";
import {
  COHORT_STATUS_CONFIG,
  ENROLLMENT_STATUS_CONFIG,
} from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function SJCohortDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cohort, isLoading } = useCohort(id);
  const { enrollments } = useEnrollments({ cohortId: id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 col-span-2" />
        </div>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Turma não encontrada</p>
        <Button onClick={() => navigate("/dashboard/student-journey/cohorts")}>
          Voltar às Turmas
        </Button>
      </div>
    );
  }

  const statusConfig = COHORT_STATUS_CONFIG[cohort.status];
  const activeEnrollments = enrollments.filter((e) => e.status === "active");
  const completedEnrollments = enrollments.filter((e) => e.status === "completed");
  const averageProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / enrollments.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cohort.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                {statusConfig.label}
              </Badge>
              {cohort.course && (
                <Link to={`/dashboard/student-journey/courses`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                    <GraduationCap className="h-3 w-3" />
                    {cohort.course.name}
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Inscrever Aluno
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Cohort Info */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>

              <div className="space-y-2 pt-2">
                {cohort.start_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Início
                    </span>
                    <span>{format(new Date(cohort.start_date), "dd MMM yyyy", { locale: pt })}</span>
                  </div>
                )}
                {cohort.end_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fim
                    </span>
                    <span>{format(new Date(cohort.end_date), "dd MMM yyyy", { locale: pt })}</span>
                  </div>
                )}
                {cohort.capacity && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Capacidade
                    </span>
                    <span>{enrollments.length} / {cohort.capacity}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Alunos</span>
                <span className="font-medium">{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ativos</span>
                <span className="font-medium text-green-600">{activeEnrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concluídos</span>
                <span className="font-medium text-blue-600">{completedEnrollments.length}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso Médio</span>
                  <span className="font-medium">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="students">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="students" className="gap-2">
                <Users className="h-4 w-4" />
                Alunos ({enrollments.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Alunos Inscritos</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum aluno inscrito</p>
                      <Button variant="link" size="sm" className="mt-2">
                        Inscrever primeiro aluno
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {enrollments.map((enrollment) => {
                          const enrollmentStatus = ENROLLMENT_STATUS_CONFIG[enrollment.status];
                          return (
                            <div
                              key={enrollment.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => enrollment.profile_id && navigate(`/dashboard/student-journey/profiles/${enrollment.profile_id}`)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground font-medium">
                                  {enrollment.profile?.full_name?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div>
                                  <p className="font-medium">{enrollment.profile?.full_name || "Aluno"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {enrollment.profile?.email || "Sem email"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium">{enrollment.progress_percent}%</p>
                                  <Progress value={enrollment.progress_percent} className="h-1.5 w-20" />
                                </div>
                                <Badge className={cn(enrollmentStatus.bgColor, enrollmentStatus.color, "border-0")}>
                                  {enrollmentStatus.label}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configurações da Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Configurações avançadas em breve</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
