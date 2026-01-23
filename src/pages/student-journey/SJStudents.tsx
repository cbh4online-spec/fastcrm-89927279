import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, Search, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { useProfiles } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { Link } from "react-router-dom";

export default function SJStudents() {
  const { profiles, isLoading, deleteProfile } = useProfiles();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || p.lifecycle_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const stages: (LifecycleStage | "all")[] = ["all", "lead", "prospect", "enrolled", "active", "completed", "inactive", "churned"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os perfis de alunos</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />Novo Perfil
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {stages.map((stage) => (
            <Button key={stage} variant={stageFilter === stage ? "default" : "outline"} size="sm" onClick={() => setStageFilter(stage)} className="whitespace-nowrap">
              {stage === "all" ? "Todos" : LIFECYCLE_STAGE_CONFIG[stage].label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum perfil encontrado</TableCell></TableRow>
              ) : filteredProfiles.map((profile) => {
                const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <Link to={`/dashboard/student-journey/students/${profile.id}`} className="hover:underline">{profile.full_name}</Link>
                      {profile.contact_id && <Badge variant="outline" className="ml-2 text-xs">CRM</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{profile.email || "-"}</TableCell>
                    <TableCell><Badge className={cn(stageConfig.bgColor, stageConfig.color, "border-0")}>{stageConfig.label}</Badge></TableCell>
                    <TableCell><Badge variant={profile.dropout_risk === "high" ? "destructive" : "secondary"}>{profile.dropout_risk}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(profile.created_at), "dd MMM yyyy", { locale: pt })}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link to={`/dashboard/student-journey/students/${profile.id}`}><Eye className="h-4 w-4 mr-2" />Ver</Link></DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => confirm("Remover?") && deleteProfile.mutate(profile.id)}><Trash2 className="h-4 w-4 mr-2" />Remover</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreateProfileDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
