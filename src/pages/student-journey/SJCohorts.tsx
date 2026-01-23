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
  GraduationCap,
  Users,
  Calendar,
} from "lucide-react";
import { useCohorts } from "@/hooks/useStudentJourney";
import { COHORT_STATUS_CONFIG, CohortStatus } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateCohortDialog } from "@/components/student-journey/CreateCohortDialog";

export default function SJCohorts() {
  const { cohorts, isLoading, deleteCohort } = useCohorts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CohortStatus | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredCohorts = cohorts.filter((cohort) => {
    const matchesSearch =
      cohort.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cohort.course_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || cohort.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses: (CohortStatus | "all")[] = [
    "all",
    "planned",
    "enrolling",
    "active",
    "completed",
    "cancelled",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
          <p className="text-muted-foreground">
            Gerencie turmas e coortes de formação
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Turma
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statuses.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="whitespace-nowrap"
            >
              {status === "all"
                ? "Todas"
                : COHORT_STATUS_CONFIG[status as CohortStatus].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            A carregar...
          </div>
        ) : filteredCohorts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Nenhuma turma encontrada
          </div>
        ) : (
          filteredCohorts.map((cohort) => {
            const statusConfig = COHORT_STATUS_CONFIG[cohort.status];
            return (
              <Card key={cohort.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{cohort.name}</CardTitle>
                        {cohort.course_name && (
                          <p className="text-sm text-muted-foreground">
                            {cohort.course_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (
                              confirm("Tem a certeza que pretende remover esta turma?")
                            ) {
                              deleteCohort.mutate(cohort.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge
                      className={cn(
                        statusConfig.bgColor,
                        statusConfig.color,
                        "border-0"
                      )}
                    >
                      {statusConfig.label}
                    </Badge>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {cohort.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(cohort.start_date), "dd MMM yyyy", {
                            locale: pt,
                          })}
                        </div>
                      )}
                      {cohort.max_students && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Máx. {cohort.max_students}
                        </div>
                      )}
                    </div>

                    {cohort.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cohort.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <CreateCohortDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
