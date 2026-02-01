import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Calendar,
  MessageSquare,
  ClipboardList,
  X,
  TrendingUp,
  Star,
  Clock,
  Filter,
  Edit,
} from "lucide-react";
import { useProfiles, useCourses } from "@/hooks/useStudentJourney";
import { useJourneyTransitions } from "@/hooks/useJourneyTransitions";
import {
  LIFECYCLE_STAGE_CONFIG,
  DROPOUT_RISK_CONFIG,
  LifecycleStage,
  DropoutRisk,
  ActivationPotential,
} from "@/types/studentJourney";
import { JOURNEY_STATE_CONFIG, JourneyState } from "@/types/sjJourney";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { ScheduleFollowUpDialog } from "@/components/student-journey/ScheduleFollowUpDialog";
import { ImportProfilesDialog } from "@/components/student-journey/ImportProfilesDialog";
import { EditProfileDialog } from "@/components/student-journey/EditProfileDialog";
import { Link, useSearchParams } from "react-router-dom";
import type { SJProfile } from "@/types/studentJourney";

export default function SJProfiles() {
  const { profiles, isLoading, deleteProfile } = useProfiles();
  const { journeyProfiles } = useJourneyTransitions();
  const { courses } = useCourses();
  const [searchParams] = useSearchParams();

  // Read initial filter from URL params (supports both "stage" and "state" params)
  const getInitialStageFilter = (): LifecycleStage | "all" => {
    const stageParam = searchParams.get("stage") || searchParams.get("state");
    if (stageParam && stageParam !== "all") {
      // Map journey states to lifecycle stages if needed
      const stateToStageMap: Record<string, LifecycleStage> = {
        "external_lead": "lead",
        "new_student": "new_student",
        "active_student": "active_student",
        "completed_active": "completed_active",
        "eligible_progression": "eligible_progression",
        "alumni": "alumni",
        "inactive": "inactive",
        "churned": "churned",
      };
      return (stateToStageMap[stageParam] || stageParam) as LifecycleStage;
    }
    return "all";
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">(getInitialStageFilter());
  const [riskFilter, setRiskFilter] = useState<DropoutRisk | "all">(
    searchParams.get("risk") === "high" ? "high" : "all"
  );
  const [potentialFilter, setPotentialFilter] = useState<ActivationPotential | "all">("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [hasFollowUpFilter, setHasFollowUpFilter] = useState<"all" | "with" | "without" | "overdue">("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<SJProfile | null>(null);

  // Get unique interests and specialties
  const allInterests = useMemo(() => {
    const interests = new Set<string>();
    profiles.forEach((p) => {
      if (p.primary_interest) interests.add(p.primary_interest);
      if (p.primary_specialty) interests.add(p.primary_specialty);
      p.interests?.forEach((i) => interests.add(i));
    });
    return Array.from(interests).sort();
  }, [profiles]);

  // Map profiles with journey data
  const enrichedProfiles = useMemo(() => {
    return profiles.map(profile => {
      const journeyProfile = journeyProfiles.find(jp => jp.profile.id === profile.id);
      return {
        ...profile,
        journeyState: journeyProfile?.currentState,
        activationScore: journeyProfile?.activationScore || 0,
        daysSinceCompletion: journeyProfile?.daysSinceLastCompletion,
        completedCourses: journeyProfile?.completedEnrollments || 0,
      };
    });
  }, [profiles, journeyProfiles]);

  const filteredProfiles = useMemo(() => {
    const now = new Date();
    return enrichedProfiles.filter((p) => {
      const matchesSearch =
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery);
      const matchesStage = stageFilter === "all" || p.lifecycle_stage === stageFilter;
      const matchesRisk = riskFilter === "all" || p.dropout_risk === riskFilter;
      const matchesPotential = potentialFilter === "all" || p.activation_potential === potentialFilter;
      const matchesInterest =
        interestFilter === "all" ||
        p.primary_interest === interestFilter ||
        p.primary_specialty === interestFilter ||
        p.interests?.includes(interestFilter);
      
      // Time since last course filter
      let matchesTime = true;
      if (timeFilter !== "all" && p.last_course_completed_at) {
        const daysSince = differenceInDays(now, parseISO(p.last_course_completed_at));
        if (timeFilter === "30") matchesTime = daysSince <= 30;
        else if (timeFilter === "90") matchesTime = daysSince <= 90;
        else if (timeFilter === "180") matchesTime = daysSince <= 180;
        else if (timeFilter === "180+") matchesTime = daysSince > 180;
      } else if (timeFilter !== "all" && !p.last_course_completed_at) {
        matchesTime = false;
      }

      // Follow-up filter
      let matchesFollowUp = true;
      if (hasFollowUpFilter === "with") matchesFollowUp = !!p.next_follow_up_at;
      else if (hasFollowUpFilter === "without") matchesFollowUp = !p.next_follow_up_at;
      else if (hasFollowUpFilter === "overdue" && p.next_follow_up_at) {
        matchesFollowUp = parseISO(p.next_follow_up_at) < now;
      } else if (hasFollowUpFilter === "overdue") {
        matchesFollowUp = false;
      }

      return matchesSearch && matchesStage && matchesRisk && matchesPotential && 
             matchesInterest && matchesTime && matchesFollowUp;
    });
  }, [enrichedProfiles, searchQuery, stageFilter, riskFilter, potentialFilter, 
      interestFilter, timeFilter, hasFollowUpFilter]);

  const stages: (LifecycleStage | "all")[] = [
    "all", "lead", "new_student", "active_student", "completed_active",
    "eligible_progression", "alumni", "inactive", "churned",
  ];

  const hasActiveFilters =
    stageFilter !== "all" ||
    riskFilter !== "all" ||
    potentialFilter !== "all" ||
    interestFilter !== "all" ||
    timeFilter !== "all" ||
    hasFollowUpFilter !== "all";

  const clearFilters = () => {
    setStageFilter("all");
    setRiskFilter("all");
    setPotentialFilter("all");
    setInterestFilter("all");
    setTimeFilter("all");
    setHasFollowUpFilter("all");
    setSearchQuery("");
  };

  const handleScheduleFollowUp = (profileId: string) => {
    setSelectedProfileId(profileId);
    setFollowUpDialogOpen(true);
  };

  const handleEditProfile = (profile: SJProfile) => {
    setEditingProfile(profile);
    setEditProfileDialogOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-gray-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-gray-100 dark:bg-gray-800/50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfis de Alunos</h1>
          <p className="text-muted-foreground">
            {filteredProfiles.length} de {profiles.length} perfis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportProfilesDialog />
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Perfil
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={potentialFilter} onValueChange={(v) => setPotentialFilter(v as ActivationPotential | "all")}>
              <SelectTrigger className="w-[160px]">
                <TrendingUp className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Potencial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo potencial</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o tempo</SelectItem>
                <SelectItem value="30">Última formação ≤30d</SelectItem>
                <SelectItem value="90">Última formação ≤90d</SelectItem>
                <SelectItem value="180">Última formação ≤180d</SelectItem>
                <SelectItem value="180+">Última formação &gt;180d</SelectItem>
              </SelectContent>
            </Select>
            <Select value={interestFilter} onValueChange={setInterestFilter}>
              <SelectTrigger className="w-[160px]">
                <Star className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas áreas</SelectItem>
                {allInterests.map((interest) => (
                  <SelectItem key={interest} value={interest}>
                    {interest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hasFollowUpFilter} onValueChange={(v) => setHasFollowUpFilter(v as "all" | "with" | "without" | "overdue")}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Follow-up" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com follow-up</SelectItem>
                <SelectItem value="without">Sem follow-up</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Stage filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <Button
              key={stage}
              variant={stageFilter === stage ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter(stage)}
              className="whitespace-nowrap"
            >
              {stage === "all" ? "Todos" : LIFECYCLE_STAGE_CONFIG[stage]?.label || stage}
              {stage !== "all" && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {profiles.filter((p) => p.lifecycle_stage === stage).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Profiles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Próximo Follow-up</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum perfil encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => {
                  const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/dashboard/student-journey/profiles/${profile.id}`}
                          className="hover:underline flex items-center gap-2"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                            {profile.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{profile.full_name}</span>
                            {profile.contact_id && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                CRM
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(stageConfig?.bgColor, stageConfig?.color, "border-0")}>
                          {stageConfig?.label || profile.lifecycle_stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex px-2 py-1 rounded-md text-xs font-semibold",
                          getScoreBg(profile.activationScore),
                          getScoreColor(profile.activationScore)
                        )}>
                          {profile.activationScore}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{profile.completedCourses}</span>
                          <span className="text-muted-foreground text-xs">completado(s)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.primary_specialty || profile.primary_interest ? (
                          <Badge variant="secondary">
                            {profile.primary_specialty || profile.primary_interest}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profile.next_follow_up_at ? (
                          <span className={cn(
                            "text-sm",
                            parseISO(profile.next_follow_up_at) < new Date() && "text-red-600 font-medium"
                          )}>
                            {format(new Date(profile.next_follow_up_at), "dd MMM, HH:mm", { locale: pt })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/student-journey/profiles/${profile.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhe
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleScheduleFollowUp(profile.id)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Marcar Follow-up
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              Nova Inscrição
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Gerar Mensagem IA
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Star className="h-4 w-4 mr-2" />
                              Marcar Interesse
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => confirm("Remover perfil?") && deleteProfile.mutate(profile.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateProfileDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <ScheduleFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        profileId={selectedProfileId}
      />
      <EditProfileDialog
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
        profile={editingProfile}
      />
    </div>
  );
}
