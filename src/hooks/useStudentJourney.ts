import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type {
  SJStudent,
  SJCohort,
  SJEnrollment,
  SJTouchpoint,
  SJTask,
  SJDashboardMetrics,
  CreateStudentData,
  CreateCohortData,
  CreateEnrollmentData,
  CreateTouchpointData,
  CreateTaskData,
  StudentStage,
} from "@/types/studentJourney";

// ============================================
// STUDENTS HOOKS
// ============================================

export function useStudents() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-students", currentWorkspace?.id],
    queryFn: async (): Promise<SJStudent[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sj_students")
        .select(`
          *,
          contact:contacts(id, name, email)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJStudent[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createStudent = useMutation({
    mutationFn: async (data: CreateStudentData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: student, error } = await supabase
        .from("sj_students")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-students"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Aluno criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating student:", error);
      toast.error("Erro ao criar aluno");
    },
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJStudent> & { id: string }) => {
      const { custom_fields, contact, enrollments_count, active_enrollments, ...updateData } = data;
      const { data: student, error } = await supabase
        .from("sj_students")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-students"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Aluno atualizado");
    },
    onError: (error) => {
      console.error("Error updating student:", error);
      toast.error("Erro ao atualizar aluno");
    },
  });

  const updateStudentStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: StudentStage }) => {
      const { data: student, error } = await supabase
        .from("sj_students")
        .update({ 
          stage, 
          stage_changed_at: new Date().toISOString() 
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-students"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Etapa atualizada");
    },
    onError: (error) => {
      console.error("Error updating stage:", error);
      toast.error("Erro ao atualizar etapa");
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sj_students")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-students"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Aluno removido");
    },
    onError: (error) => {
      console.error("Error deleting student:", error);
      toast.error("Erro ao remover aluno");
    },
  });

  return {
    students: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createStudent,
    updateStudent,
    updateStudentStage,
    deleteStudent,
  };
}

export function useStudent(studentId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sj-student", studentId],
    queryFn: async (): Promise<SJStudent | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from("sj_students")
        .select(`
          *,
          contact:contacts(id, name, email)
        `)
        .eq("id", studentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data as unknown as SJStudent;
    },
    enabled: !!studentId && !!currentWorkspace?.id,
  });
}

// ============================================
// COHORTS HOOKS
// ============================================

export function useCohorts() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-cohorts", currentWorkspace?.id],
    queryFn: async (): Promise<SJCohort[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sj_cohorts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data || []) as SJCohort[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createCohort = useMutation({
    mutationFn: async (data: CreateCohortData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: cohort, error } = await supabase
        .from("sj_cohorts")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-cohorts"] });
      toast.success("Turma criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating cohort:", error);
      toast.error("Erro ao criar turma");
    },
  });

  const updateCohort = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJCohort> & { id: string }) => {
      const { settings, students_count, active_students, ...updateData } = data;
      const { data: cohort, error } = await supabase
        .from("sj_cohorts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-cohorts"] });
      toast.success("Turma atualizada");
    },
    onError: (error) => {
      console.error("Error updating cohort:", error);
      toast.error("Erro ao atualizar turma");
    },
  });

  const deleteCohort = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sj_cohorts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-cohorts"] });
      toast.success("Turma removida");
    },
    onError: (error) => {
      console.error("Error deleting cohort:", error);
      toast.error("Erro ao remover turma");
    },
  });

  return {
    cohorts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCohort,
    updateCohort,
    deleteCohort,
  };
}

// ============================================
// ENROLLMENTS HOOKS
// ============================================

export function useEnrollments(filters?: { studentId?: string; cohortId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-enrollments", currentWorkspace?.id, filters],
    queryFn: async (): Promise<SJEnrollment[]> => {
      if (!currentWorkspace?.id) return [];

      let q = supabase
        .from("sj_enrollments")
        .select(`
          *,
          student:sj_students(id, name, email, stage),
          cohort:sj_cohorts(id, name, course_name, status)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (filters?.studentId) {
        q = q.eq("student_id", filters.studentId);
      }
      if (filters?.cohortId) {
        q = q.eq("cohort_id", filters.cohortId);
      }

      const { data, error } = await q.order("enrolled_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJEnrollment[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createEnrollment = useMutation({
    mutationFn: async (data: CreateEnrollmentData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: enrollment, error } = await supabase
        .from("sj_enrollments")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
      toast.success("Inscrição criada");
    },
    onError: (error) => {
      console.error("Error creating enrollment:", error);
      toast.error("Erro ao criar inscrição");
    },
  });

  const updateEnrollment = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJEnrollment> & { id: string }) => {
      const { data: enrollment, error } = await supabase
        .from("sj_enrollments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-enrollments"] });
      toast.success("Inscrição atualizada");
    },
    onError: (error) => {
      console.error("Error updating enrollment:", error);
      toast.error("Erro ao atualizar inscrição");
    },
  });

  return {
    enrollments: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createEnrollment,
    updateEnrollment,
  };
}

// ============================================
// TOUCHPOINTS HOOKS
// ============================================

export function useTouchpoints(studentId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-touchpoints", currentWorkspace?.id, studentId],
    queryFn: async (): Promise<SJTouchpoint[]> => {
      if (!currentWorkspace?.id) return [];

      let q = supabase
        .from("sj_touchpoints")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (studentId) {
        q = q.eq("student_id", studentId);
      }

      const { data, error } = await q.order("occurred_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SJTouchpoint[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createTouchpoint = useMutation({
    mutationFn: async (data: CreateTouchpointData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: touchpoint, error } = await supabase
        .from("sj_touchpoints")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return touchpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-touchpoints"] });
      toast.success("Touchpoint registado");
    },
    onError: (error) => {
      console.error("Error creating touchpoint:", error);
      toast.error("Erro ao registar touchpoint");
    },
  });

  return {
    touchpoints: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTouchpoint,
  };
}

// ============================================
// TASKS HOOKS
// ============================================

export function useSJTasks(filters?: { studentId?: string; cohortId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-tasks", currentWorkspace?.id, filters],
    queryFn: async (): Promise<SJTask[]> => {
      if (!currentWorkspace?.id) return [];

      let q = supabase
        .from("sj_tasks")
        .select(`
          *,
          student:sj_students(id, name),
          cohort:sj_cohorts(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (filters?.studentId) {
        q = q.eq("student_id", filters.studentId);
      }
      if (filters?.cohortId) {
        q = q.eq("cohort_id", filters.cohortId);
      }

      const { data, error } = await q.order("due_date", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SJTask[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createTask = useMutation({
    mutationFn: async (data: CreateTaskData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: task, error } = await supabase
        .from("sj_tasks")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-tasks"] });
      toast.success("Tarefa criada");
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJTask> & { id: string }) => {
      const { data: task, error } = await supabase
        .from("sj_tasks")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-tasks"] });
      toast.success("Tarefa atualizada");
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    },
  });

  return {
    tasks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTask,
    updateTask,
  };
}

// ============================================
// DASHBOARD METRICS
// ============================================

export function useSJDashboardMetrics() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sj-dashboard-metrics", currentWorkspace?.id],
    queryFn: async (): Promise<SJDashboardMetrics> => {
      if (!currentWorkspace?.id) {
        return {
          totalStudents: 0,
          activeStudents: 0,
          completedStudents: 0,
          churnRate: 0,
          activeCohorts: 0,
          averageProgress: 0,
          stageBreakdown: {
            lead: 0,
            inscrito: 0,
            ativo: 0,
            concluido: 0,
            inativo: 0,
            churn: 0,
          },
        };
      }

      // Fetch students
      const { data: students } = await supabase
        .from("sj_students")
        .select("stage")
        .eq("workspace_id", currentWorkspace.id);

      // Fetch cohorts
      const { data: cohorts } = await supabase
        .from("sj_cohorts")
        .select("status")
        .eq("workspace_id", currentWorkspace.id);

      // Fetch enrollments for average progress
      const { data: enrollments } = await supabase
        .from("sj_enrollments")
        .select("progress_percentage")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active");

      const stageBreakdown: Record<string, number> = {
        lead: 0,
        inscrito: 0,
        ativo: 0,
        concluido: 0,
        inativo: 0,
        churn: 0,
      };

      (students || []).forEach((s) => {
        if (stageBreakdown[s.stage] !== undefined) {
          stageBreakdown[s.stage]++;
        }
      });

      const totalStudents = students?.length || 0;
      const activeStudents = stageBreakdown.ativo;
      const completedStudents = stageBreakdown.concluido;
      const churnCount = stageBreakdown.churn;
      const churnRate = totalStudents > 0 ? (churnCount / totalStudents) * 100 : 0;

      const activeCohorts = (cohorts || []).filter((c) => c.status === "active").length;

      const avgProgress =
        enrollments && enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) /
            enrollments.length
          : 0;

      return {
        totalStudents,
        activeStudents,
        completedStudents,
        churnRate,
        activeCohorts,
        averageProgress: Math.round(avgProgress),
        stageBreakdown: stageBreakdown as SJDashboardMetrics["stageBreakdown"],
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}
