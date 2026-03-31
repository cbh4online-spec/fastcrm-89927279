import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────
export interface OnboardingTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  task_templates?: OnboardingTaskTemplate[];
}

export interface OnboardingTaskTemplate {
  id: string;
  template_id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  category: "hr" | "it" | "manager" | "team" | "self";
  assigned_to_role: string | null;
  due_days: number;
  sort_order: number;
  is_required: boolean;
}

export interface Onboarding {
  id: string;
  workspace_id: string;
  employee_id: string;
  template_id: string | null;
  buddy_id: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  start_date: string;
  expected_end_date: string | null;
  completed_at: string | null;
  progress: number;
  notes: string | null;
  created_at: string;
  employee?: { id: string; full_name: string; department: string | null; job_title: string | null; avatar_url: string | null };
  buddy?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface OnboardingTask {
  id: string;
  onboarding_id: string;
  title: string;
  description: string | null;
  category: "hr" | "it" | "manager" | "team" | "self";
  assigned_to: string | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  is_required: boolean;
  sort_order: number;
  notes: string | null;
}

export interface OnboardingFeedback {
  id: string;
  onboarding_id: string;
  feedback_type: "30_days" | "60_days" | "90_days";
  due_date: string;
  employee_rating: number | null;
  employee_comments: string | null;
  manager_rating: number | null;
  manager_comments: string | null;
  buddy_rating: number | null;
  buddy_comments: string | null;
  submitted_at: string | null;
}

export interface BuddyMatch {
  employee_id: string;
  employee_name: string;
  department?: string;
  job_title?: string;
  score: number;
  reasoning: string;
}

// ─── Hooks ───────────────────────────────────────────────────

export function useOnboardings(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["hr-onboardings", workspaceId, statusFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("hr_onboardings")
        .select(`
          *,
          employee:hr_employees!hr_onboardings_employee_id_fkey(id, full_name, department, job_title, avatar_url),
          buddy:hr_employees!hr_onboardings_buddy_id_fkey(id, full_name, avatar_url)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "in_progress" | "completed" | "cancelled");
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Onboarding[];
    },
    enabled: !!workspaceId,
  });
}

export function useOnboardingDetail(onboardingId: string | undefined) {
  return useQuery({
    queryKey: ["hr-onboarding-detail", onboardingId],
    queryFn: async () => {
      if (!onboardingId) return null;
      const [
        { data: onboarding, error: obErr },
        { data: tasks, error: tErr },
        { data: feedback, error: fErr },
      ] = await Promise.all([
        supabase
          .from("hr_onboardings")
          .select(`
            *,
            employee:hr_employees!hr_onboardings_employee_id_fkey(id, full_name, department, job_title, avatar_url),
            buddy:hr_employees!hr_onboardings_buddy_id_fkey(id, full_name, avatar_url)
          `)
          .eq("id", onboardingId)
          .single(),
        supabase
          .from("hr_onboarding_tasks")
          .select("*")
          .eq("onboarding_id", onboardingId)
          .order("sort_order"),
        supabase
          .from("hr_onboarding_feedback")
          .select("*")
          .eq("onboarding_id", onboardingId)
          .order("due_date"),
      ]);
      if (obErr) throw obErr;
      return {
        onboarding: onboarding as unknown as Onboarding,
        tasks: (tasks || []) as unknown as OnboardingTask[],
        feedback: (feedback || []) as unknown as OnboardingFeedback[],
      };
    },
    enabled: !!onboardingId,
  });
}

export function useOnboardingTemplates() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hr-onboarding-templates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("hr_onboarding_templates")
        .select(`*, task_templates:hr_onboarding_task_templates(*)`)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as OnboardingTemplate[];
    },
    enabled: !!workspaceId,
  });

  const createTemplate = useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase
        .from("hr_onboarding_templates")
        .insert({ workspace_id: workspaceId, ...values })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Template criado");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-templates"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase.from("hr_onboarding_templates").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template actualizado");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-templates"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_onboarding_templates").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template removido");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-templates"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, createTemplate, updateTemplate, deleteTemplate };
}

export function useTaskTemplates(templateId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hr-onboarding-task-templates", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from("hr_onboarding_task_templates")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as OnboardingTaskTemplate[];
    },
    enabled: !!templateId,
  });

  const addTask = useMutation({
    mutationFn: async (values: Omit<OnboardingTaskTemplate, "id" | "template_id" | "workspace_id">) => {
      if (!templateId || !workspaceId) throw new Error("Missing context");
      const { error } = await supabase
        .from("hr_onboarding_task_templates")
        .insert({ ...values, template_id: templateId, workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa adicionada ao template");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-task-templates", templateId] });
      qc.invalidateQueries({ queryKey: ["hr-onboarding-templates"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("hr_onboarding_task_templates").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa removida");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-task-templates", templateId] });
      qc.invalidateQueries({ queryKey: ["hr-onboarding-templates"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return { ...query, addTask, removeTask };
}

export function useStartOnboarding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      employee_id: string;
      template_id: string;
      buddy_id?: string;
      start_date?: string;
      workspace_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("hr-onboarding-start", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Onboarding iniciado com sucesso!");
      qc.invalidateQueries({ queryKey: ["hr-onboardings"] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useBuddyMatch() {
  return useMutation({
    mutationFn: async (params: { new_employee_id: string; workspace_id: string }) => {
      const { data, error } = await supabase.functions.invoke("hr-buddy-match-ai", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { matches: BuddyMatch[]; fallback?: boolean };
    },
    onError: (e) => toast.error(`Erro no buddy match: ${e.message}`),
  });
}

export function useUpdateOnboardingTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, is_completed }: { taskId: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("hr_onboarding_tasks")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-onboarding-detail"] });
      qc.invalidateQueries({ queryKey: ["hr-onboardings"] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useSubmitOnboardingFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      ...values
    }: {
      feedbackId: string;
      employee_rating?: number;
      employee_comments?: string;
      manager_rating?: number;
      manager_comments?: string;
      buddy_rating?: number;
      buddy_comments?: string;
    }) => {
      const { error } = await supabase
        .from("hr_onboarding_feedback")
        .update({ ...values, submitted_at: new Date().toISOString() })
        .eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback submetido");
      qc.invalidateQueries({ queryKey: ["hr-onboarding-detail"] });
    },
    onError: (e) => toast.error(e.message),
  });
}
