import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Mail,
  Phone,
  Link2,
  Calendar,
  Edit,
  MoreHorizontal,
  Plus,
  MessageSquare,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  User,
  Zap,
} from "lucide-react";
import {
  useProfile,
  useEnrollments,
  useTouchpoints,
  useSJTasks,
  useProfiles,
} from "@/hooks/useStudentJourney";
import {
  LIFECYCLE_STAGE_CONFIG,
  DROPOUT_RISK_CONFIG,
  ENROLLMENT_STATUS_CONFIG,
  TOUCHPOINT_TYPE_CONFIG,
} from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateEnrollmentDialog } from "@/components/student-journey/CreateEnrollmentDialog";
import { CreateTouchpointDialog } from "@/components/student-journey/CreateTouchpointDialog";
import { CreateTaskDialog } from "@/components/student-journey/CreateTaskDialog";
import { ScheduleFollowUpDialog } from "@/components/student-journey/ScheduleFollowUpDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function SJProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile(id);
  const { enrollments } = useEnrollments({ profileId: id });
  const { touchpoints } = useTouchpoints(id);
  const { tasks } = useSJTasks({ profileId: id });

  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [touchpointDialogOpen, setTouchpointDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);

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

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Perfil não encontrado</p>
        <Button onClick={() => navigate("/dashboard/student-journey/profiles")}>
          Voltar aos Perfis
        </Button>
      </div>
    );
  }

  const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
  const riskConfig = DROPOUT_RISK_CONFIG[profile.dropout_risk];

  const openTasks = tasks.filter((t) => t.status === "open");
  const completedTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(stageConfig.bgColor, stageConfig.color, "border-0")}>
                {stageConfig.label}
              </Badge>
              {profile.dropout_risk === "high" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Risco Alto
                </Badge>
              )}
              {profile.contact_id && (
                <Badge variant="outline" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  Ligado ao CRM
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFollowUpDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Follow-up
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Mensagem IA
          </Button>
          <Button size="sm" onClick={() => setEnrollmentDialogOpen(true)}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Nova Inscrição
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Identificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-2xl font-medium">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">Score: {profile.student_score}/100</p>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${profile.email}`} className="text-primary hover:underline">
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>
              {!profile.contact_id && (
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Link2 className="h-4 w-4 mr-2" />
                  Ligar a Contacto CRM
                </Button>
              )}
              {profile.contact_id && (
                <Link to={`/dashboard/contacts/${profile.contact_id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <User className="h-4 w-4 mr-2" />
                    Ver Contacto CRM
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Interesses</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.primary_interest && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Principal</p>
                  <Badge variant="default">{profile.primary_interest}</Badge>
                </div>
              )}
              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profile.interests.map((interest, idx) => (
                    <Badge key={idx} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum interesse definido</p>
              )}
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risco de Desistência</span>
                <Badge className={cn(riskConfig.bgColor, riskConfig.color, "border-0")}>
                  {riskConfig.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canal Preferido</span>
                <span className="text-sm capitalize">{profile.preferred_channel}</span>
              </div>
              {profile.next_follow_up_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Próximo Follow-up</span>
                  <span className="text-sm">
                    {format(new Date(profile.next_follow_up_at), "dd MMM, HH:mm", { locale: pt })}
                  </span>
                </div>
              )}
              {profile.last_activity_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última Atividade</span>
                  <span className="text-sm">
                    {format(new Date(profile.last_activity_at), "dd MMM yyyy", { locale: pt })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="enrollments">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="enrollments" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Inscrições ({enrollments.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Timeline ({touchpoints.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tarefas ({openTasks.length})
              </TabsTrigger>
            </TabsList>

            {/* Enrollments Tab */}
            <TabsContent value="enrollments" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Inscrições em Cursos</CardTitle>
                    <Button size="sm" onClick={() => setEnrollmentDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nova
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma inscrição</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => {
                        const statusConfig = ENROLLMENT_STATUS_CONFIG[enrollment.status];
                        return (
                          <div key={enrollment.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{enrollment.course?.name || "Curso"}</p>
                                {enrollment.cohort && (
                                  <p className="text-sm text-muted-foreground">
                                    Turma: {enrollment.cohort.name}
                                  </p>
                                )}
                              </div>
                              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">{enrollment.progress_percent}%</span>
                              </div>
                              <Progress value={enrollment.progress_percent} className="h-2" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Histórico de Interações</CardTitle>
                    <Button size="sm" onClick={() => setTouchpointDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {touchpoints.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma interação registada</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {touchpoints.map((tp, idx) => {
                          const typeConfig = TOUCHPOINT_TYPE_CONFIG[tp.touchpoint_type];
                          return (
                            <div key={tp.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <Zap className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {idx < touchpoints.length - 1 && (
                                  <div className="w-px h-full bg-border mt-2" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{typeConfig.label}</Badge>
                                    {tp.outcome && (
                                      <Badge variant="outline" className="capitalize">
                                        {tp.outcome.replace("_", " ")}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(tp.occurred_at), "dd MMM, HH:mm", { locale: pt })}
                                  </span>
                                </div>
                                {tp.message_preview && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {tp.message_preview}
                                  </p>
                                )}
                                {tp.next_action && (
                                  <p className="text-sm text-primary mt-1">
                                    → {tp.next_action}
                                  </p>
                                )}
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

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tarefas</CardTitle>
                    <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nova
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma tarefa</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {openTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="h-5 w-5 rounded border-2 border-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground">
                                Prazo: {format(new Date(task.due_date), "dd MMM yyyy", { locale: pt })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {completedTasks.length > 0 && (
                        <div className="pt-2 border-t mt-4">
                          <p className="text-xs text-muted-foreground mb-2">
                            Concluídas ({completedTasks.length})
                          </p>
                          {completedTasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="flex items-center gap-3 p-2 opacity-60">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="text-sm line-through">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <CreateEnrollmentDialog
        open={enrollmentDialogOpen}
        onOpenChange={setEnrollmentDialogOpen}
        profileId={id}
      />
      <CreateTouchpointDialog
        open={touchpointDialogOpen}
        onOpenChange={setTouchpointDialogOpen}
        profileId={id}
      />
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        profileId={id}
      />
      <ScheduleFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        profileId={id || null}
      />
    </div>
  );
}
