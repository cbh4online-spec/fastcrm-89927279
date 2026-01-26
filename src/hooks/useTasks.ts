import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";

export type TaskStatus = "pending" | "done";
export type TaskRelatedType = "lead" | "contact" | "company" | "opportunity";

export interface Task {
  id: string;
  workspace_id: string;
  related_type: TaskRelatedType;
  related_id: string;
  title: string;
  due_at: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  related_type?: TaskRelatedType;
  related_id?: string;
  title: string;
  due_at?: string;
  assigned_to?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, "related_type" | "related_id">> {
  id: string;
}

export function useTasks(filters?: { 
  related_type?: TaskRelatedType; 
  related_id?: string;
  status?: TaskStatus;
  assigned_to?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["tasks", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("tasks")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (filters?.related_type) {
        query = query.eq("related_type", filters.related_type);
      }

      if (filters?.related_id) {
        query = query.eq("related_id", filters.related_id);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useTask(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Task | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await workspaceClient
        .from("tasks")
        .insert({
          workspace_id: currentWorkspace.id,
          related_type: input.related_type || null,
          related_id: input.related_id || null,
          title: input.title,
          due_at: input.due_at || null,
          assigned_to: input.assigned_to || null,
          status: input.status || "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] });
    },
  });
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: TaskStatus }) => {
      const newStatus: TaskStatus = currentStatus === "pending" ? "done" : "pending";
      
      const { data, error } = await workspaceClient
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] });
    },
  });
}
