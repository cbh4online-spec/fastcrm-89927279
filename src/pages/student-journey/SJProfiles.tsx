import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
import { BulkEnrollmentDialog } from "@/components/student-journey/BulkEnrollmentDialog";
import { EditProfileDialog } from "@/components/student-journey/EditProfileDialog";
import { CreateEnrollmentDialog } from "@/components/student-journey/CreateEnrollmentDialog";
import { GenerateMessageDialog } from "@/components/student-journey/GenerateMessageDialog";
import { AddInterestDialog } from "@/components/student-journey/AddInterestDialog";
import { Link, useSearchParams } from "react-router-dom";
import type { SJProfile } from "@/types/studentJourney";

export default function SJProfiles() {
  const { profiles, isLoading, deleteProfile } = useProfiles();
  const { journeyProfiles } = useJourneyTransitions();
  const { courses } = useCourses();
  const [searchParams] = useSearchParams();

  // Map journey states to database lifecycle stages
  const stateToStageMap: Record<string, LifecycleStage> = {
    "external_lead": "lead",
    "lead": "lead",
    "prospect": "prospect",
    "new_student": "enrolled",
    "enrolled": "enrolled",
    "active_student": "active",
    "active": "active",
    "completed_active": "completed",
    "completed": "completed",
    "eligible_progression": "completed",
    "alumni": "completed",
    "inactive": "inactive",
    "churned": "churned",
  };

  // Get initial stage filter from URL
  const getStageFromUrl = (): LifecycleStage | "all" => {
    const stageParam = searchParams.get("stage") || searchParams.get("state");
    if (stageParam && stageParam !== "all") {
      return stateToStageMap[stageParam] || (stageParam as LifecycleStage);
    }
    return "all";
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">(getStageFromUrl());
  const [riskFilter, setRiskFilter] = useState<DropoutRisk | "all">(
    searchParams.get("risk") === "high" ? "high" : "all"
  );
  const [potentialFilter, setPotentialFilter] = useState<ActivationPotential | "all">("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [hasFollowUpFilter, setHasFollowUpFilter] = useState<"all" | "with" | "without" | "overdue">("all");

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Sorting state
  type SortField = 'name' | 'stage' | 'score' | 'courses' | 'specialty' | 'followup';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sync filter with URL params when they change
  useEffect(() => {
    const newStage = getStageFromUrl();
    setStageFilter(newStage);
  }, [searchParams]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [interestDialogOpen, setInterestDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SJProfile | null>(null);
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

  // Sorted profiles
  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'stage':
          comparison = a.lifecycle_stage.localeCompare(b.lifecycle_stage);
          break;
        case 'score':
          comparison = (a.activationScore || 0) - (b.activationScore || 0);
          break;
        case 'courses':
          comparison = (a.completedCourses || 0) - (b.completedCourses || 0);
          break;
        case 'specialty':
          comparison = (a.primary_specialty || '').localeCompare(b.primary_specialty || '');
          break;
        case 'followup':
          const dateA = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : 0;
          const dateB = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredProfiles, sortField, sortDirection]);

  // Use actual database lifecycle stages (matching the CHECK constraint)
  const stages: (LifecycleStage | "all")[] = [
    "all", "lead", "prospect", "enrolled", "active", "completed", "inactive", "churned",
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

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedProfiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProfiles.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmed = confirm(
      `Tem a certeza que deseja remover ${selectedIds.size} perfil(is)?`
    );
    
    if (confirmed) {
      for (const id of selectedIds) {
        await deleteProfile.mutateAsync(id);
      }
      clearSelection();
    }
  };

  // SortIcon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" /> 
      : <ArrowDown className="h-3 w-3" />;
  };

  const handleScheduleFollowUp = (profileId: string) => {
    setSelectedProfileId(profileId);
    setFollowUpDialogOpen(true);
  };

  const handleEditProfile = (profile: SJProfile) => {
    setEditingProfile(profile);
    setEditProfileDialogOpen(true);
  };

  const handleNewEnrollment = (profile: SJProfile) => {
    setSelectedProfile(profile);
    setEnrollmentDialogOpen(true);
  };

  const handleGenerateMessage = (profile: SJProfile) => {
    setSelectedProfile(profile);
    setMessageDialogOpen(true);
  };

  const handleMarkInterest = (profile: SJProfile) => {
    setSelectedProfile(profile);
    setInterestDialogOpen(true);
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
          <BulkEnrollmentDialog />
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

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">
            {selectedIds.size} perfil(is) seleccionado(s)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar Seleccionados
            </Button>
          </div>
        </div>
      )}

      {/* Profiles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === sortedProfiles.length && sortedProfiles.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Nome
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('stage')}>
                  <div className="flex items-center gap-1">
                    Estado
                    <SortIcon field="stage" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('score')}>
                  <div className="flex items-center gap-1">
                    Score
                    <SortIcon field="score" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('courses')}>
                  <div className="flex items-center gap-1">
                    Cursos
                    <SortIcon field="courses" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('specialty')}>
                  <div className="flex items-center gap-1">
                    Especialidade
                    <SortIcon field="specialty" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('followup')}>
                  <div className="flex items-center gap-1">
                    Follow-up
                    <SortIcon field="followup" />
                  </div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : sortedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum perfil encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedProfiles.map((profile) => {
                  const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
                  return (
                    <TableRow key={profile.id} className={cn(selectedIds.has(profile.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(profile.id)}
                          onCheckedChange={() => toggleSelect(profile.id)}
                          aria-label={`Seleccionar ${profile.full_name}`}
                        />
                      </TableCell>
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
                            parseISO(profile.next_follow_up_at) < new Date() && "text-destructive font-medium"
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
                            <DropdownMenuItem onClick={() => handleNewEnrollment(profile)}>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              Nova Inscrição
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateMessage(profile)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Gerar Mensagem IA
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkInterest(profile)}>
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
      <CreateEnrollmentDialog
        open={enrollmentDialogOpen}
        onOpenChange={setEnrollmentDialogOpen}
        profileId={selectedProfile?.id}
      />
      <GenerateMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        profile={selectedProfile}
      />
      <AddInterestDialog
        open={interestDialogOpen}
        onOpenChange={setInterestDialogOpen}
        profile={selectedProfile}
      />
    </div>
  );
}
