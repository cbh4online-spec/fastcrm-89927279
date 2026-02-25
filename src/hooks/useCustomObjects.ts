import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CustomObject {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectRecord {
  id: string;
  workspace_id: string;
  object_id: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomObjects() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["custom-objects", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await (supabase
        .from("custom_objects")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as CustomObject[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateCustomObject() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { name: string; slug: string; description?: string; icon?: string; color?: string }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase
        .from("custom_objects")
        .insert({
          workspace_id: currentWorkspace.id,
          ...input,
        }) as any)
        .select()
        .single();
      if (error) throw error;
      return data as CustomObject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-objects", currentWorkspace?.id] });
      toast.success("Object created");
    },
    onError: () => toast.error("Failed to create object"),
  });
}

export function useDeleteCustomObject() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete — set is_active = false
      const { error } = await (supabase
        .from("custom_objects")
        .update({ is_active: false, updated_at: new Date().toISOString() } as any) as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-objects", currentWorkspace?.id] });
      toast.success("Objeto arquivado");
    },
    onError: () => toast.error("Erro ao arquivar objeto"),
  });
}

// Object Records
export function useObjectRecords(objectId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["object-records", currentWorkspace?.id, objectId],
    queryFn: async () => {
      if (!currentWorkspace || !objectId) return [];
      const { data, error } = await (supabase
        .from("object_records")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .eq("object_id", objectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ObjectRecord[];
    },
    enabled: !!currentWorkspace && !!objectId,
  });
}

export function useCreateObjectRecord() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { object_id: string; data: Record<string, unknown> }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase
        .from("object_records")
        .insert({
          workspace_id: currentWorkspace.id,
          object_id: input.object_id,
          data: input.data as any,
        } as any) as any)
        .select()
        .single();
      if (error) throw error;
      return data as ObjectRecord;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["object-records", currentWorkspace?.id, vars.object_id] });
      toast.success("Record created");
    },
    onError: () => toast.error("Failed to create record"),
  });
}

export function useUpdateObjectRecord() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; object_id: string; data: Record<string, unknown> }) => {
      const { error } = await (supabase
        .from("object_records")
        .update({ data: input.data as any, updated_at: new Date().toISOString() } as any) as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["object-records", currentWorkspace?.id, vars.object_id] });
      toast.success("Record updated");
    },
    onError: () => toast.error("Failed to update record"),
  });
}

export function useDeleteObjectRecord() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; object_id: string }) => {
      const { error } = await (supabase
        .from("object_records")
        .delete() as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["object-records", currentWorkspace?.id, vars.object_id] });
      toast.success("Record deleted");
    },
    onError: () => toast.error("Failed to delete record"),
  });
}
