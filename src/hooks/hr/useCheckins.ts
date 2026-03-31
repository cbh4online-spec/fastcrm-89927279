import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface HRCheckin {
  id: string;
  workspace_id: string;
  employee_id: string;
  manager_id: string;
  scheduled_at: string;
  completed_at: string | null;
  status: string;
  agenda: string | null;
  notes: string | null;
  action_items: { text: string; done: boolean }[];
  mood_rating: number | null;
  created_at: string;
  updated_at: string;
  employee?: { full_name: string; avatar_url: string | null } | null;
  manager?: { full_name: string; avatar_url: string | null } | null;
}

export function useCheckins(status?: string) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["hr_checkins", currentWorkspace?.id, status],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      let q = workspaceClient
        .from("hr_checkins")
        .select("*, employee:hr_employees!hr_checkins_employee_id_fkey(full_name, avatar_url), manager:hr_employees!hr_checkins_manager_id_fkey(full_name, avatar_url)")
        .eq("workspace_id", currentWorkspace.id)
        .order("scheduled_at", { ascending: false });

      if (status) q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HRCheckin[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateCheckin() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      manager_id: string;
      scheduled_at: string;
      agenda?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { error } = await workspaceClient.from("hr_checkins").insert({
        workspace_id: currentWorkspace.id,
        ...input,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in agendado");
      qc.invalidateQueries({ queryKey: ["hr_checkins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useHREmployeesList() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["hr_employees_list", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await workspaceClient
        .from("hr_employees")
        .select("id, full_name, avatar_url")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data || []) as { id: string; full_name: string; avatar_url: string | null }[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useUpdateCheckin() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      notes?: string;
      action_items?: { text: string; done: boolean }[];
      mood_rating?: number;
      status?: string;
      completed_at?: string;
    }) => {
      const { error } = await workspaceClient
        .from("hr_checkins")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in actualizado");
      qc.invalidateQueries({ queryKey: ["hr_checkins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
