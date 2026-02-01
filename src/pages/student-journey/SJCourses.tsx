import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trash2,
  GraduationCap,
  Users,
  Calendar,
  Edit,
  BookOpen,
  Layers,
} from "lucide-react";
import { useCourses, useCohorts, useEnrollments } from "@/hooks/useStudentJourney";
import { COHORT_STATUS_CONFIG, CohortStatus, CourseType } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateCourseDialog } from "@/components/student-journey/CreateCourseDialog";
import { CreateCohortDialog } from "@/components/student-journey/CreateCohortDialog";
import { EditCourseDialog } from "@/components/student-journey/EditCourseDialog";
import { SJCourse } from "@/types/studentJourney";

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

export default function SJCourses() {
  const { courses, isLoading: coursesLoading, deleteCourse } = useCourses();
  const { cohorts, isLoading: cohortsLoading, deleteCohort } = useCohorts();
  const { enrollments } = useEnrollments();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("courses");
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createCohortOpen, setCreateCohortOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SJCourse | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Filter courses
  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get cohorts for selected course
  const selectedCourseCohorts = selectedCourseId
    ? cohorts.filter((c) => c.course_id === selectedCourseId)
    : [];

  // Get enrollments for selected cohort
  const getEnrollmentsForCohort = (cohortId: string) =>
    enrollments.filter((e) => e.cohort_id === cohortId);

  const getCourseStats = (courseId: string) => {
    const courseCohorts = cohorts.filter((c) => c.course_id === courseId);
    const courseEnrollments = enrollments.filter((e) => e.course_id === courseId);
    return {
      cohortsCount: courseCohorts.length,
      enrollmentsCount: courseEnrollments.length,
      activeCohorts: courseCohorts.filter((c) => c.status === "running").length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos & Turmas</h1>
          <p className="text-muted-foreground">Gerencie cursos e coortes de formação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateCohortOpen(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Nova Turma
          </Button>
          <Button onClick={() => setCreateCourseOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Curso
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Cursos ({filteredCourses.length})
          </h2>
          {coursesLoading ? (
            <p className="text-muted-foreground text-sm">A carregar...</p>
          ) : filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum curso encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredCourses.map((course) => {
                const stats = getCourseStats(course.id);
                const isSelected = selectedCourseId === course.id;
                return (
                  <Card
                    key={course.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedCourseId(course.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{course.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {COURSE_TYPE_LABELS[course.course_type]}
                              </Badge>
                              {!course.is_active && (
                                <Badge variant="outline" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCourse(course);
                                setEditCourseOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirm("Remover curso?") && deleteCourse.mutate(course.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {stats.cohortsCount} turmas
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stats.enrollmentsCount} inscritos
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Course Detail / Cohorts */}
        <div className="lg:col-span-2">
          {selectedCourseId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Turmas do Curso
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateCohortOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Turma
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedCourseCohorts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma turma neste curso</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Capacidade</TableHead>
                        <TableHead>Inscritos</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCourseCohorts.map((cohort) => {
                        const statusConfig = COHORT_STATUS_CONFIG[cohort.status];
                        const cohortEnrollments = getEnrollmentsForCohort(cohort.id);
                        return (
                          <TableRow key={cohort.id}>
                            <TableCell className="font-medium">{cohort.name}</TableCell>
                            <TableCell>
                              <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cohort.start_date
                                ? format(new Date(cohort.start_date), "dd MMM yyyy", { locale: pt })
                                : "-"}
                            </TableCell>
                            <TableCell>{cohort.capacity || "∞"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{cohortEnrollments.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Inscritos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      confirm("Remover turma?") && deleteCohort.mutate(cohort.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecione um Curso</p>
                <p className="text-sm">Clique num curso à esquerda para ver as turmas</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateCourseDialog open={createCourseOpen} onOpenChange={setCreateCourseOpen} />
      <CreateCohortDialog
        open={createCohortOpen}
        onOpenChange={setCreateCohortOpen}
        defaultCourseId={selectedCourseId || undefined}
      />
      <EditCourseDialog
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        course={editingCourse}
      />
    </div>
  );
}
