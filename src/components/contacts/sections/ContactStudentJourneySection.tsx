import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContactStudentJourneyProfile } from "@/hooks/useContactStudentJourneyProfile";
import { useEnrollments, useCourses } from "@/hooks/useStudentJourney";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, UserPlus, ExternalLink, BookOpen, Target, 
  Trophy, Clock, Plus, CheckCircle2, Circle, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateEnrollmentDialog } from "@/components/student-journey/CreateEnrollmentDialog";

interface ContactStudentJourneySectionProps {
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
}

const LIFECYCLE_STAGE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  prospect: { label: "Prospecto", color: "bg-slate-500/10 text-slate-600 border-slate-500/30", icon: Target },
  lead: { label: "Lead", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Target },
  applicant: { label: "Candidato", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: BookOpen },
  enrolled: { label: "Inscrito", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: BookOpen },
  active: { label: "Aluno Ativo", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: GraduationCap },
  inactive: { label: "Inativo", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: Clock },
  graduated: { label: "Graduado", color: "bg-green-500/10 text-green-600 border-green-500/30", icon: Trophy },
  dropped: { label: "Desistiu", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: Clock },
  alumni: { label: "Alumni", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", icon: Trophy },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Concluído", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", icon: CheckCircle2 },
  active: { label: "Em Progresso", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", icon: ArrowRight },
  enrolled: { label: "Inscrito", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30", icon: BookOpen },
  pending: { label: "Pendente", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: Clock },
  interested: { label: "Interessado", color: "text-slate-600 bg-slate-50 dark:bg-slate-950/30", icon: Circle },
  invited: { label: "Convidado", color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30", icon: Circle },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactStudentJourneySection({ 
  contactId, 
  contactName,
  contactEmail 
}: ContactStudentJourneySectionProps) {
  const navigate = useNavigate();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const { data: profile, isLoading: isLoadingProfile } = useContactStudentJourneyProfile(contactId);
  const { enrollments = [], isLoading: isLoadingEnrollments } = useEnrollments(profile?.id ? { profileId: profile.id } : {});
  const { courses = [] } = useCourses();

  // Filter available courses (active and not enrolled)
  const enrolledCourseIds = enrollments.map((e: any) => e.course_id);
  const availableCourses = courses.filter(
    (course) => course.is_active && !enrolledCourseIds.includes(course.id)
  );

  const handleViewProfile = () => {
    if (profile?.id) {
      navigate(`/dashboard/student-journey/profiles/${profile.id}`);
    }
  };

  const handleCreateProfile = () => {
    const params = new URLSearchParams({
      contact_id: contactId,
      name: contactName,
      ...(contactEmail && { email: contactEmail }),
    });
    navigate(`/dashboard/student-journey/profiles/new?${params.toString()}`);
  };

  const handleEnrollInCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setEnrollDialogOpen(true);
  };

  if (isLoadingProfile) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No profile exists
  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sem Perfil no Student Journey</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            Este contacto ainda não tem um perfil no Student Journey. 
            Crie um para acompanhar a sua jornada educacional.
          </p>
          <Button onClick={handleCreateProfile} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Criar Perfil
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage] || LIFECYCLE_STAGE_CONFIG.prospect;
  const defaultTab = enrollments.length > 0 ? "journey" : "available";

  return (
    <>
      <Card>
        {/* Header with Avatar, Name, and Stage Badge */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{profile.full_name}</h3>
              <p className="text-xs text-muted-foreground">
                Lifecycle: {stageConfig.label}
              </p>
            </div>
            <Badge variant="outline" className={cn("gap-1 shrink-0", stageConfig.color)}>
              {stageConfig.label}
            </Badge>
          </div>
        </CardHeader>

        {/* Tabs Content */}
        <CardContent className="pt-0">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="journey" className="text-xs">
                Jornada ({enrollments.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-xs">
                Disponíveis ({availableCourses.length})
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-xs">
                Perfil
              </TabsTrigger>
            </TabsList>

            {/* Tab: Minha Jornada */}
            <TabsContent value="journey" className="mt-4 space-y-2">
              {enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <Circle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ainda não iniciou nenhuma formação
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEnrollDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Inscrever em Formação
                  </Button>
                </div>
              ) : (
                <>
                  {enrollments.map((enrollment: any) => {
                    const statusInfo = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusInfo.icon;
                    const progress = enrollment.progress_percentage || 0;
                    
                    return (
                      <div 
                        key={enrollment.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                          statusInfo.color
                        )}
                        onClick={() => navigate(`/dashboard/student-journey/profiles/${profile.id}?tab=enrollments`)}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {enrollment.course?.name || "Curso"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={progress} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {progress}%
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => navigate(`/dashboard/student-journey/profiles/${profile.id}?tab=enrollments`)}
                  >
                    Ver detalhes completos
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Tab: Formações Disponíveis */}
            <TabsContent value="available" className="mt-4">
              {availableCourses.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Inscrito em todas as formações disponíveis!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableCourses.map((course) => (
                    <div 
                      key={course.id}
                      className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate mb-0.5">
                        {course.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mb-2">
                        {course.course_type || "Presencial"}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full h-7 text-xs"
                        onClick={() => handleEnrollInCourse(course.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Inscrever
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Perfil */}
            <TabsContent value="profile" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">{enrollments.length}</p>
                  <p className="text-xs text-muted-foreground">Inscrições</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {enrollments.filter((e: any) => e.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
              
              <Button 
                className="w-full gap-2" 
                onClick={handleViewProfile}
              >
                <ExternalLink className="w-4 h-4" />
                Ver Perfil Completo
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <CreateEnrollmentDialog
        open={enrollDialogOpen}
        onOpenChange={(open) => {
          setEnrollDialogOpen(open);
          if (!open) setSelectedCourseId(undefined);
        }}
        profileId={profile.id}
      />
    </>
  );
}
