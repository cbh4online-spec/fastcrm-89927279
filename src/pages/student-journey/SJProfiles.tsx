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
  Filter,
  X,
  AlertTriangle,
} from "lucide-react";
import { useProfiles, useCourses } from "@/hooks/useStudentJourney";
import {
  LIFECYCLE_STAGE_CONFIG,
  DROPOUT_RISK_CONFIG,
  LifecycleStage,
  DropoutRisk,
} from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { ScheduleFollowUpDialog } from "@/components/student-journey/ScheduleFollowUpDialog";
import { Link, useSearchParams } from "react-router-dom";

export default function SJProfiles() {
  const { profiles, isLoading, deleteProfile } = useProfiles();
  const { courses } = useCourses();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">(
    (searchParams.get("stage") as LifecycleStage) || "all"
  );
  const [riskFilter, setRiskFilter] = useState<DropoutRisk | "all">(
    searchParams.get("risk") === "high" ? "high" : "all"
  );
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [hasFollowUpFilter, setHasFollowUpFilter] = useState<"all" | "with" | "without">("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Get unique interests
  const allInterests = useMemo(() => {
    const interests = new Set<string>();
    profiles.forEach((p) => {
      if (p.primary_interest) interests.add(p.primary_interest);
      p.interests?.forEach((i) => interests.add(i));
    });
    return Array.from(interests).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery);
      const matchesStage = stageFilter === "all" || p.lifecycle_stage === stageFilter;
      const matchesRisk = riskFilter === "all" || p.dropout_risk === riskFilter;
      const matchesInterest =
        interestFilter === "all" ||
        p.primary_interest === interestFilter ||
        p.interests?.includes(interestFilter);
      const matchesFollowUp =
        hasFollowUpFilter === "all" ||
        (hasFollowUpFilter === "with" && p.next_follow_up_at) ||
        (hasFollowUpFilter === "without" && !p.next_follow_up_at);
      return matchesSearch && matchesStage && matchesRisk && matchesInterest && matchesFollowUp;
    });
  }, [profiles, searchQuery, stageFilter, riskFilter, interestFilter, hasFollowUpFilter]);

  const stages: (LifecycleStage | "all")[] = [
    "all",
    "lead",
    "prospect",
    "enrolled",
    "active",
    "completed",
    "inactive",
    "churned",
  ];

  const hasActiveFilters =
    stageFilter !== "all" ||
    riskFilter !== "all" ||
    interestFilter !== "all" ||
    hasFollowUpFilter !== "all";

  const clearFilters = () => {
    setStageFilter("all");
    setRiskFilter("all");
    setInterestFilter("all");
    setHasFollowUpFilter("all");
    setSearchQuery("");
  };

  const handleScheduleFollowUp = (profileId: string) => {
    setSelectedProfileId(profileId);
    setFollowUpDialogOpen(true);
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
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Perfil
        </Button>
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
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as DropoutRisk | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os riscos</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={interestFilter} onValueChange={setInterestFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Interesse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos interesses</SelectItem>
                {allInterests.map((interest) => (
                  <SelectItem key={interest} value={interest}>
                    {interest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hasFollowUpFilter} onValueChange={(v) => setHasFollowUpFilter(v as "all" | "with" | "without")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Follow-up" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com follow-up</SelectItem>
                <SelectItem value="without">Sem follow-up</SelectItem>
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
              {stage === "all" ? "Todos" : LIFECYCLE_STAGE_CONFIG[stage].label}
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
                <TableHead>Email</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Interesse</TableHead>
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
                  const riskConfig = DROPOUT_RISK_CONFIG[profile.dropout_risk];
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
                      <TableCell className="text-muted-foreground">
                        {profile.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(stageConfig.bgColor, stageConfig.color, "border-0")}>
                          {stageConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {profile.dropout_risk === "high" && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          <Badge className={cn(riskConfig.bgColor, riskConfig.color, "border-0")}>
                            {riskConfig.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.primary_interest ? (
                          <Badge variant="secondary">{profile.primary_interest}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profile.next_follow_up_at ? (
                          <span className="text-sm">
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
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/student-journey/profiles/${profile.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhe
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleScheduleFollowUp(profile.id)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Marcar Follow-up
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              Criar Inscrição
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Gerar Mensagem IA
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
    </div>
  );
}
