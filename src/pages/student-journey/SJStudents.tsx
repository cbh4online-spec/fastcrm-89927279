import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Search, MoreHorizontal, Eye, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useProfiles } from "@/hooks/useStudentJourney";
import { LIFECYCLE_STAGE_CONFIG, LifecycleStage } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { Link } from "react-router-dom";

type SortField = 'name' | 'email' | 'stage' | 'risk' | 'created';
type SortDirection = 'asc' | 'desc';

export default function SJStudents() {
  const { profiles, isLoading, deleteProfile } = useProfiles();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || p.lifecycle_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Sorted profiles
  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'stage':
          comparison = a.lifecycle_stage.localeCompare(b.lifecycle_stage);
          break;
        case 'risk':
          comparison = a.dropout_risk.localeCompare(b.dropout_risk);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredProfiles, sortField, sortDirection]);

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
    if (selectedIds.size === sortedProfiles.length && sortedProfiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProfiles.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk delete
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

  const stages: (LifecycleStage | "all")[] = ["all", "lead", "prospect", "enrolled", "active", "completed", "inactive", "churned"];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" /> 
      : <ArrowDown className="h-3 w-3" />;
  };

  const isAllSelected = selectedIds.size === sortedProfiles.length && sortedProfiles.length > 0;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < sortedProfiles.length;

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

      {/* Bulk actions bar */}
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = isSomeSelected;
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Nome
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    <SortIcon field="email" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('stage')}
                >
                  <div className="flex items-center gap-1">
                    Etapa
                    <SortIcon field="stage" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('risk')}
                >
                  <div className="flex items-center gap-1">
                    Risco
                    <SortIcon field="risk" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('created')}
                >
                  <div className="flex items-center gap-1">
                    Criado
                    <SortIcon field="created" />
                  </div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : sortedProfiles.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum perfil encontrado</TableCell></TableRow>
              ) : sortedProfiles.map((profile) => {
                const stageConfig = LIFECYCLE_STAGE_CONFIG[profile.lifecycle_stage];
                const isSelected = selectedIds.has(profile.id);
                return (
                  <TableRow key={profile.id} className={cn(isSelected && "bg-primary/5")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(profile.id)}
                        aria-label={`Seleccionar ${profile.full_name}`}
                      />
                    </TableCell>
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
