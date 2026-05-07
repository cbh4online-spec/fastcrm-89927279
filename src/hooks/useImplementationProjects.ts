import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useImplementationProjects() {
  const { currentWorkspace: ws } = useWorkspace();
  return useQuery({
    queryKey: ["impl-projects", ws?.id],
    enabled: !!ws?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("implementation_projects" as any)
        .select("*").eq("workspace_id", ws!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImplementationProject(id?: string) {
  return useQuery({
    queryKey: ["impl-project", id],
    enabled: !!id,
    queryFn: async () => {
      const [proj, phases, tasks, blockers, time, gl, glItems, ho, hoItems, events] = await Promise.all([
        supabase.from("implementation_projects" as any).select("*").eq("id", id!).maybeSingle(),
        supabase.from("implementation_project_phases" as any).select("*").eq("project_id", id!).order("sort_order"),
        supabase.from("implementation_project_tasks" as any).select("*").eq("project_id", id!).order("sort_order"),
        supabase.from("implementation_blockers" as any).select("*").eq("project_id", id!).order("created_at", { ascending: false }),
        supabase.from("implementation_time_entries" as any).select("*").eq("project_id", id!).order("entry_date", { ascending: false }),
        supabase.from("implementation_golive_checklists" as any).select("*").eq("project_id", id!).order("created_at", { ascending: false }).limit(1),
        supabase.from("implementation_golive_items" as any).select("*").eq("project_id", id!).order("sort_order"),
        supabase.from("implementation_handovers" as any).select("*").eq("project_id", id!).order("created_at", { ascending: false }).limit(1),
        supabase.from("implementation_handover_items" as any).select("*").eq("project_id", id!),
        supabase.from("implementation_project_events" as any).select("*").eq("project_id", id!).order("created_at", { ascending: false }).limit(50),
      ]);
      return {
        project: (proj as any).data,
        phases: (phases as any).data ?? [],
        tasks: (tasks as any).data ?? [],
        blockers: (blockers as any).data ?? [],
        timeEntries: (time as any).data ?? [],
        checklist: ((gl as any).data ?? [])[0] ?? null,
        checklistItems: (glItems as any).data ?? [],
        handover: ((ho as any).data ?? [])[0] ?? null,
        handoverItems: (hoItems as any).data ?? [],
        events: (events as any).data ?? [],
      };
    },
  });
}

export function useImplementationTemplates() {
  return useQuery({
    queryKey: ["impl-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("implementation_project_templates" as any)
        .select("*").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateImplementationProject() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template_slug?: string; title?: string; onboarding_project_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("implementation-create-from-onboarding", {
        body: { workspace_id: ws!.id, ...input },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro");
      return data.project;
    },
    onSuccess: () => { toast.success("Projeto criado"); qc.invalidateQueries({ queryKey: ["impl-projects"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from("implementation_projects" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Projeto atualizado"); qc.invalidateQueries({ queryKey: ["impl-project"] }); qc.invalidateQueries({ queryKey: ["impl-projects"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateImplTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from("implementation_project_tasks" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["impl-project"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: any) => {
      const { error } = await supabase.from("implementation_golive_items" as any)
        .update({ status, notes, checked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["impl-project"] }),
  });
}

export function useLogTime() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; task_id?: string; duration_minutes: number; activity_type?: string; description?: string; billable?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("implementation_time_entries" as any).insert({
        ...input, workspace_id: ws!.id, user_id: u.user!.id, entry_date: new Date().toISOString().slice(0,10),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Horas registadas"); qc.invalidateQueries({ queryKey: ["impl-project"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateBlocker() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { error } = await supabase.from("implementation_blockers" as any).insert({ ...input, workspace_id: ws!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bloqueio criado"); qc.invalidateQueries({ queryKey: ["impl-project"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateHandoverSummary() {
  const { currentWorkspace: ws } = useWorkspace();
  return useMutation({
    mutationFn: async (project_id: string) => {
      const { data, error } = await supabase.functions.invoke("implementation-generate-handover-summary", {
        body: { workspace_id: ws!.id, project_id },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalyzeRisk() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project_id: string) => {
      const { data, error } = await supabase.functions.invoke("implementation-analyze-project-risk", {
        body: { workspace_id: ws!.id, project_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["impl-project"] }); qc.invalidateQueries({ queryKey: ["impl-projects"] }); },
  });
}
