import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface HRFeedback {
  id: string;
  workspace_id: string;
  from_employee_id: string;
  to_employee_id: string;
  feedback_type: string;
  title: string;
  content: string;
  is_private: boolean;
  is_anonymous: boolean;
  read_at: string | null;
  created_at: string;
  from_employee?: { full_name: string; avatar_url: string | null } | null;
  to_employee?: { full_name: string; avatar_url: string | null } | null;
}

export function useFeedback(tab: "received" | "sent" | "all" = "all", employeeId?: string) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["hr_feedback", currentWorkspace?.id, tab, employeeId],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      let q = workspaceClient
        .from("hr_feedback")
        .select("*, from_employee:hr_employees!hr_feedback_from_employee_id_fkey(full_name, avatar_url), to_employee:hr_employees!hr_feedback_to_employee_id_fkey(full_name, avatar_url)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (tab === "received" && employeeId) q = q.eq("to_employee_id", employeeId);
      if (tab === "sent" && employeeId) q = q.eq("from_employee_id", employeeId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HRFeedback[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      from_employee_id: string;
      to_employee_id: string;
      feedback_type: string;
      title: string;
      content: string;
      is_private?: boolean;
      is_anonymous?: boolean;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { error } = await workspaceClient.from("hr_feedback").insert({
        workspace_id: currentWorkspace.id,
        ...input,
        is_private: input.is_private ?? false,
        is_anonymous: input.is_anonymous ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback enviado");
      qc.invalidateQueries({ queryKey: ["hr_feedback"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkFeedbackRead() {
  const qc = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("hr_feedback")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_feedback"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
