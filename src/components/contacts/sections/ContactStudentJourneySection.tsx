import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContactStudentJourneyProfile } from "@/hooks/useContactStudentJourneyProfile";
import { useEnrollments, useCourses } from "@/hooks/useStudentJourney";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, UserPlus, ExternalLink, BookOpen, Target, Trophy, Clock, Library, Plus } from "lucide-react";
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

export function ContactStudentJourneySection({ 
  contactId, 
  contactName,
  contactEmail 
}: ContactStudentJourneySectionProps) {
  const navigate = useNavigate();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
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
    // Navigate to create profile with pre-filled contact data
    const params = new URLSearchParams({
      contact_id: contactId,
      name: contactName,
      ...(contactEmail && { email: contactEmail }),
    });
    navigate(`/dashboard/student-journey/profiles/new?${params.toString()}`);
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

  // Profile exists - show summary
  const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage] || LIFECYCLE_STAGE_CONFIG.prospect;
  const StageIcon = stageConfig.icon;

  // Get recent enrollments (max 3)
  const recentEnrollments = enrollments.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Perfil vinculado ao contacto
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn("gap-1.5", stageConfig.color)}>
              <StageIcon className="w-3.5 h-3.5" />
              {stageConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={handleViewProfile} className="gap-2 flex-1">
              <ExternalLink className="w-4 h-4" />
              Ver Perfil Completo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/dashboard/student-journey/profiles/${profile.id}?tab=enrollments`)}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Inscrições
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student Journey Overview */}
      {enrollments.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Jornada do Aluno
            </CardTitle>
            <CardDescription className="text-xs">
              Progresso nos cursos inscritos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Completed courses */}
            {enrollments.filter((e: any) => e.status === 'completed' || e.progress_percentage === 100).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Concluídos</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {enrollments.filter((e: any) => e.status === 'completed' || e.progress_percentage === 100).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {enrollments
                    .filter((e: any) => e.status === 'completed' || e.progress_percentage === 100)
                    .slice(0, 3)
                    .map((enrollment: any) => (
                      <div 
                        key={enrollment.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                          {enrollment.course?.name || "Curso"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active/In Progress courses */}
            {enrollments.filter((e: any) => (e.status === 'active' || e.status === 'enrolled') && e.progress_percentage < 100).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">Em Progresso</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {enrollments.filter((e: any) => (e.status === 'active' || e.status === 'enrolled') && e.progress_percentage < 100).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {enrollments
                    .filter((e: any) => (e.status === 'active' || e.status === 'enrolled') && e.progress_percentage < 100)
                    .slice(0, 3)
                    .map((enrollment: any) => (
                      <div 
                        key={enrollment.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate flex-1">
                          {enrollment.course?.name || "Curso"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Pending/Not Started courses */}
            {enrollments.filter((e: any) => e.status === 'pending' || (e.progress_percentage === 0 && e.status !== 'completed')).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">Por Iniciar</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {enrollments.filter((e: any) => e.status === 'pending' || (e.progress_percentage === 0 && e.status !== 'completed')).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {enrollments
                    .filter((e: any) => e.status === 'pending' || (e.progress_percentage === 0 && e.status !== 'completed'))
                    .slice(0, 3)
                    .map((enrollment: any) => (
                      <div 
                        key={enrollment.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                          {enrollment.course?.name || "Curso"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {enrollments.length > 3 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate(`/dashboard/student-journey/profiles/${profile.id}?tab=enrollments`)}
              >
                Ver todas as {enrollments.length} inscrições
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Available Courses Section */}
      {profile && availableCourses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Library className="w-4 h-4 text-violet-500" />
              Formações Disponíveis
            </CardTitle>
            <CardDescription className="text-xs">
              Cursos onde o aluno ainda não está inscrito
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {availableCourses.slice(0, 4).map((course) => (
                <div 
                  key={course.id} 
                  className="p-3 border rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900"
                >
                  <span className="font-medium text-sm text-violet-700 dark:text-violet-300 block truncate">
                    {course.name}
                  </span>
                  <span className="text-xs text-muted-foreground block capitalize">
                    {course.course_type || "Presencial"}
                  </span>
                </div>
              ))}
            </div>
            {availableCourses.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-3 gap-2"
                onClick={() => setEnrollDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Inscrever em Formação
              </Button>
            )}
            {availableCourses.length > 4 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm mt-1"
                onClick={() => navigate('/dashboard/student-journey/courses')}
              >
                Ver todos os {availableCourses.length} cursos disponíveis
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enrollment Dialog */}
      {profile && (
        <CreateEnrollmentDialog
          open={enrollDialogOpen}
          onOpenChange={setEnrollDialogOpen}
          profileId={profile.id}
        />
      )}
    </div>
  );
}
