import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useOnboardingProjects() {
  const { currentWorkspace: workspace } = useWorkspace();
  return useQuery({
    queryKey: ["onboarding-projects", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_onboarding_projects")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOnboardingProject(id?: string) {
  return useQuery({
    queryKey: ["onboarding-project", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: project }, { data: items }, { data: docs }, { data: tasks }, { data: blockers }, { data: events }] = await Promise.all([
        supabase.from("customer_onboarding_projects").select("*").eq("id", id!).maybeSingle(),
        supabase.from("customer_onboarding_checklist_items").select("*").eq("onboarding_project_id", id!).order("sort_order"),
        supabase.from("customer_onboarding_documents").select("*").eq("onboarding_project_id", id!),
        supabase.from("onboarding_internal_tasks").select("*").eq("onboarding_project_id", id!).order("created_at"),
        supabase.from("onboarding_blockers").select("*").eq("onboarding_project_id", id!),
        supabase.from("customer_onboarding_events").select("*").eq("onboarding_project_id", id!).order("created_at", { ascending: false }).limit(50),
      ]);
      return { project, items: items ?? [], docs: docs ?? [], tasks: tasks ?? [], blockers: blockers ?? [], events: events ?? [] };
    },
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { error } = await supabase.from("customer_onboarding_checklist_items")
        .update({ status, rejection_reason: rejection_reason ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item atualizado"); qc.invalidateQueries({ queryKey: ["onboarding-project"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("customer_onboarding_projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Estado atualizado"); qc.invalidateQueries({ queryKey: ["onboarding-project"] }); qc.invalidateQueries({ queryKey: ["onboarding-projects"] }); },
  });
}

export function useChecklistTemplates() {
  return useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("onboarding_checklist_templates").select("*").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProposalAcceptances() {
  const { currentWorkspace: workspace } = useWorkspace();
  return useQuery({
    queryKey: ["proposal-acceptances", workspace?.id],
    enabled: !!workspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_proposal_acceptances")
        .select("*").eq("workspace_id", workspace!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
