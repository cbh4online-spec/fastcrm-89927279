import { useNavigate } from "react-router-dom";
import { useContactStudentJourneyProfile } from "@/hooks/useContactStudentJourneyProfile";
import { useEnrollments } from "@/hooks/useStudentJourney";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, UserPlus, ExternalLink, BookOpen, Target, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { data: profile, isLoading: isLoadingProfile } = useContactStudentJourneyProfile(contactId);
  const { enrollments = [], isLoading: isLoadingEnrollments } = useEnrollments(profile?.id ? { profileId: profile.id } : {});

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

      {/* Recent Enrollments */}
      {recentEnrollments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Inscrições Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentEnrollments.map((enrollment: any) => (
                <div 
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {enrollment.course?.name || "Curso"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.status === 'active' ? 'Ativo' : 
                         enrollment.status === 'completed' ? 'Concluído' :
                         enrollment.status === 'enrolled' ? 'Inscrito' :
                         enrollment.status}
                      </p>
                    </div>
                  </div>
                  {enrollment.progress_percentage !== null && (
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={enrollment.progress_percentage} 
                        className="w-20 h-1.5" 
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {enrollment.progress_percentage}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {enrollments.length > 3 && (
              <Button 
                variant="ghost" 
                className="w-full mt-3 text-sm"
                onClick={() => navigate(`/dashboard/student-journey/profiles/${profile.id}?tab=enrollments`)}
              >
                Ver todas as {enrollments.length} inscrições
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
