import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Filter,
  UserPlus,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudentJourney";
import { STUDENT_STAGE_CONFIG, StudentStage } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateStudentDialog } from "@/components/student-journey/CreateStudentDialog";
import { Link } from "react-router-dom";

export default function SJStudents() {
  const { students, isLoading, deleteStudent } = useStudents();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StudentStage | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage =
      stageFilter === "all" || student.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const stages: (StudentStage | "all")[] = [
    "all",
    "lead",
    "inscrito",
    "ativo",
    "concluido",
    "inativo",
    "churn",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-muted-foreground">
            Gerencie os alunos e a sua jornada de formação
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Aluno
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {stages.map((stage) => (
            <Button
              key={stage}
              variant={stageFilter === stage ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter(stage)}
              className="whitespace-nowrap"
            >
              {stage === "all"
                ? "Todos"
                : STUDENT_STAGE_CONFIG[stage as StudentStage].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Interesses</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <span className="text-muted-foreground">A carregar...</span>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <span className="text-muted-foreground">
                      Nenhum aluno encontrado
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const stageConfig = STUDENT_STAGE_CONFIG[student.stage];
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/dashboard/student-journey/students/${student.id}`}
                          className="hover:underline"
                        >
                          {student.name}
                        </Link>
                        {student.contact_id && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-xs"
                          >
                            CRM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            stageConfig.bgColor,
                            stageConfig.color,
                            "border-0"
                          )}
                        >
                          {stageConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(student.interests || []).slice(0, 2).map((i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {i}
                            </Badge>
                          ))}
                          {(student.interests?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{student.interests!.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(student.created_at), "dd MMM yyyy", {
                          locale: pt,
                        })}
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
                              <Link
                                to={`/dashboard/student-journey/students/${student.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Tem a certeza que pretende remover este aluno?"
                                  )
                                ) {
                                  deleteStudent.mutate(student.id);
                                }
                              }}
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

      <CreateStudentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
