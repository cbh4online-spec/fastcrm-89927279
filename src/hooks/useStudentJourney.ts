import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type {
  SJProfile,
  SJCourse,
  SJCohort,
  SJEnrollment,
  SJTouchpoint,
  SJTask,
  SJDashboardMetrics,
  CreateProfileData,
  CreateCourseData,
  CreateCohortData,
  CreateEnrollmentData,
  CreateTouchpointData,
  CreateTaskData,
  LifecycleStage,
} from "@/types/studentJourney";

// ============================================
// PROFILES HOOKS
// ============================================

export function useProfiles() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-profiles", currentWorkspace?.id],
    queryFn: async (): Promise<SJProfile[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sj_profiles")
        .select(`
          *,
          contact:contacts(id, name, email)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJProfile[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (data: CreateProfileData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: profile, error } = await supabase
        .from("sj_profiles")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
          interests: data.interests || [],
        })
        .select()
        .single();

      if (error) throw error;
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Perfil criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating profile:", error);
      toast.error("Erro ao criar perfil");
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJProfile> & { id: string }) => {
      // Remove fields that shouldn't be sent to the database
      const { contact, enrollments_count, specialties_progress, ...rest } = data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...rest };
      if (specialties_progress !== undefined) {
        updateData.specialties_progress = specialties_progress;
      }
      const { data: profile, error } = await supabase
        .from("sj_profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Perfil atualizado");
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    },
  });

  const updateLifecycleStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LifecycleStage }) => {
      const { data: profile, error } = await supabase
        .from("sj_profiles")
        .update({ lifecycle_stage: stage })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Etapa atualizada");
    },
    onError: (error) => {
      console.error("Error updating stage:", error);
      toast.error("Erro ao atualizar etapa");
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sj_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sj-dashboard-metrics"] });
      toast.success("Perfil removido");
    },
    onError: (error) => {
      console.error("Error deleting profile:", error);
      toast.error("Erro ao remover perfil");
    },
  });

  return {
    profiles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createProfile,
    updateProfile,
    updateLifecycleStage,
    deleteProfile,
  };
}

export function useProfile(profileId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sj-profile", profileId],
    queryFn: async (): Promise<SJProfile | null> => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from("sj_profiles")
        .select(`
          *,
          contact:contacts(id, name, email)
        `)
        .eq("id", profileId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data as unknown as SJProfile;
    },
    enabled: !!profileId && !!currentWorkspace?.id,
  });
}

// ============================================
// COURSES HOOKS
// ============================================

export function useCourses() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-courses", currentWorkspace?.id],
    queryFn: async (): Promise<SJCourse[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("sj_courses")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJCourse[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createCourse = useMutation({
    mutationFn: async (data: CreateCourseData) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: course, error } = await supabase
        .from("sj_courses")
        .insert({
          workspace_id: currentWorkspace.id,
          ...data,
          tags: data.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-courses"] });
      toast.success("Curso criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating course:", error);
      toast.error("Erro ao criar curso");
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SJCourse> & { id: string }) => {
      const { cohorts_count, enrollments_count, settings, ...updateData } = data;
      const { data: course, error } = await supabase
        .from("sj_courses")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-courses"] });
      toast.success("Curso atualizado");
    },
    onError: (error) => {
      console.error("Error updating course:", error);
      toast.error("Erro ao atualizar curso");
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sj_courses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-courses"] });
      toast.success("Curso removido");
    },
    onError: (error) => {
      console.error("Error deleting course:", error);
      toast.error("Erro ao remover curso");
    },
  });

  return {
    courses: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

// ============================================
// COHORTS HOOKS
// ============================================

export function useCohorts(courseId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-cohorts", currentWorkspace?.id, courseId],
    queryFn: async (): Promise<SJCohort[]> => {
      if (!currentWorkspace?.id) return [];

      let q = supabase
        .from("sj_cohorts")
        .select(`
          *,
          course:sj_courses(id, name, course_type)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (courseId) {
        q = q.eq("course_id", courseId);
      }

      const { data, error } = await q.order("start_date", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJCohort[];
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
    mutationFn: async ({ id, settings, ...data }: Partial<SJCohort> & { id: string }) => {
      const { course, enrollments_count, ...updateData } = data;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = { ...updateData };
      if (settings !== undefined) {
        updatePayload.settings = settings;
      }
      
      const { data: cohort, error } = await supabase
        .from("sj_cohorts")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sj-cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["sj-cohort"] });
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

// Single cohort hook
export function useCohort(cohortId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["sj-cohort", cohortId],
    queryFn: async (): Promise<SJCohort | null> => {
      if (!cohortId) return null;

      const { data, error } = await supabase
        .from("sj_cohorts")
        .select(`
          *,
          course:sj_courses(id, name, course_type)
        `)
        .eq("id", cohortId)
        .single();

      if (error) throw error;
      return data as unknown as SJCohort;
    },
    enabled: !!cohortId && !!currentWorkspace?.id,
  });
}

// ============================================
// ENROLLMENTS HOOKS
// ============================================

export function useEnrollments(filters?: { profileId?: string; courseId?: string; cohortId?: string }) {
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
          profile:sj_profiles(id, full_name, email, lifecycle_stage),
          course:sj_courses(id, name, course_type),
          cohort:sj_cohorts(id, name, status)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (filters?.profileId) q = q.eq("profile_id", filters.profileId);
      if (filters?.courseId) q = q.eq("course_id", filters.courseId);
      if (filters?.cohortId) q = q.eq("cohort_id", filters.cohortId);

      const { data, error } = await q.order("created_at", { ascending: false });

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
      const { profile, course, cohort, ...updateData } = data;
      const { data: enrollment, error } = await supabase
        .from("sj_enrollments")
        .update(updateData)
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

export function useTouchpoints(profileId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sj-touchpoints", currentWorkspace?.id, profileId],
    queryFn: async (): Promise<SJTouchpoint[]> => {
      if (!currentWorkspace?.id) return [];

      let q = supabase
        .from("sj_touchpoints")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (profileId) q = q.eq("profile_id", profileId);

      const { data, error } = await q.order("occurred_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SJTouchpoint[];
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

export function useSJTasks(filters?: { profileId?: string; status?: string }) {
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
          profile:sj_profiles(id, full_name, email)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (filters?.profileId) q = q.eq("profile_id", filters.profileId);
      if (filters?.status) q = q.eq("status", filters.status);

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
      const { profile, ...updateData } = data;
      const { data: task, error } = await supabase
        .from("sj_tasks")
        .update(updateData)
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
          totalProfiles: 0,
          activeProfiles: 0,
          completedProfiles: 0,
          churnedProfiles: 0,
          churnRate: 0,
          activeCourses: 0,
          runningCohorts: 0,
          averageProgress: 0,
          highRiskCount: 0,
          lifecycleBreakdown: {
            lead: 0,
            prospect: 0,
            new_student: 0,
            enrolled: 0,
            active: 0,
            active_student: 0,
            completed: 0,
            completed_active: 0,
            eligible_progression: 0,
            alumni: 0,
            inactive: 0,
            churned: 0,
          },
        };
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("sj_profiles")
        .select("lifecycle_stage, dropout_risk")
        .eq("workspace_id", currentWorkspace.id);

      // Fetch courses
      const { data: courses } = await supabase
        .from("sj_courses")
        .select("is_active")
        .eq("workspace_id", currentWorkspace.id);

      // Fetch cohorts
      const { data: cohorts } = await supabase
        .from("sj_cohorts")
        .select("status")
        .eq("workspace_id", currentWorkspace.id);

      // Fetch enrollments for average progress
      const { data: enrollments } = await supabase
        .from("sj_enrollments")
        .select("progress_percent")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active");

      const lifecycleBreakdown: Record<string, number> = {
        lead: 0,
        prospect: 0,
        new_student: 0,
        enrolled: 0,
        active: 0,
        active_student: 0,
        completed: 0,
        completed_active: 0,
        eligible_progression: 0,
        alumni: 0,
        inactive: 0,
        churned: 0,
      };

      let highRiskCount = 0;

      (profiles || []).forEach((p) => {
        if (lifecycleBreakdown[p.lifecycle_stage] !== undefined) {
          lifecycleBreakdown[p.lifecycle_stage]++;
        }
        if (p.dropout_risk === "high") highRiskCount++;
      });

      const totalProfiles = profiles?.length || 0;
      const activeProfiles = lifecycleBreakdown.active;
      const completedProfiles = lifecycleBreakdown.completed;
      const churnedProfiles = lifecycleBreakdown.churned;
      const churnRate = totalProfiles > 0 ? (churnedProfiles / totalProfiles) * 100 : 0;

      const activeCourses = (courses || []).filter((c) => c.is_active).length;
      const runningCohorts = (cohorts || []).filter((c) => c.status === "running").length;

      const avgProgress =
        enrollments && enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / enrollments.length
          : 0;

      return {
        totalProfiles,
        activeProfiles,
        completedProfiles,
        churnedProfiles,
        churnRate,
        activeCourses,
        runningCohorts,
        averageProgress: Math.round(avgProgress),
        highRiskCount,
        lifecycleBreakdown: lifecycleBreakdown as SJDashboardMetrics["lifecycleBreakdown"],
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}
