import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CoreObjectField {
  id: string;
  workspace_id: string;
  object_id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  is_system: boolean;
  options: Record<string, unknown> | null;
  default_value: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoreObjectView {
  id: string;
  workspace_id: string;
  object_id: string;
  name: string;
  filters: Record<string, unknown>;
  sort_config: Record<string, unknown>;
  visible_fields: string[] | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Fields ──

export function useCoreObjectFields(objectId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["core-object-fields", currentWorkspace?.id, objectId],
    queryFn: async () => {
      if (!currentWorkspace || !objectId) return [];
      const { data, error } = await (supabase
        .from("core_object_fields")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .eq("object_id", objectId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as CoreObjectField[];
    },
    enabled: !!currentWorkspace && !!objectId,
  });
}

export function useCreateObjectField() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { object_id: string; name: string; slug: string; field_type: string; is_required?: boolean; options?: Record<string, unknown>; default_value?: string; sort_order?: number }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase
        .from("core_object_fields")
        .insert({ workspace_id: currentWorkspace.id, ...input } as any) as any)
        .select()
        .single();
      if (error) throw error;
      return data as CoreObjectField;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["core-object-fields", currentWorkspace?.id, v.object_id] });
      toast.success("Campo criado");
    },
    onError: () => toast.error("Erro ao criar campo"),
  });
}

export function useUpdateObjectField() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; object_id: string; name?: string; field_type?: string; is_required?: boolean; options?: Record<string, unknown>; default_value?: string; sort_order?: number }) => {
      const { id, object_id, ...rest } = input;
      const { error } = await (supabase
        .from("core_object_fields")
        .update({ ...rest, updated_at: new Date().toISOString() } as any) as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["core-object-fields", currentWorkspace?.id, v.object_id] });
      toast.success("Campo atualizado");
    },
    onError: () => toast.error("Erro ao atualizar campo"),
  });
}

export function useDeleteObjectField() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; object_id: string }) => {
      const { error } = await (supabase
        .from("core_object_fields")
        .delete() as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["core-object-fields", currentWorkspace?.id, v.object_id] });
      toast.success("Campo removido");
    },
    onError: () => toast.error("Erro ao remover campo"),
  });
}

// ── Views ──

export function useCoreObjectViews(objectId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["core-object-views", currentWorkspace?.id, objectId],
    queryFn: async () => {
      if (!currentWorkspace || !objectId) return [];
      const { data, error } = await (supabase
        .from("core_object_views")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .eq("object_id", objectId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as CoreObjectView[];
    },
    enabled: !!currentWorkspace && !!objectId,
  });
}

export function useCreateObjectView() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { object_id: string; name: string; visible_fields?: string[]; filters?: Record<string, unknown>; sort_config?: Record<string, unknown>; is_default?: boolean }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const { data, error } = await (supabase
        .from("core_object_views")
        .insert({ workspace_id: currentWorkspace.id, ...input } as any) as any)
        .select()
        .single();
      if (error) throw error;
      return data as CoreObjectView;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["core-object-views", currentWorkspace?.id, v.object_id] });
      toast.success("View criada");
    },
    onError: () => toast.error("Erro ao criar view"),
  });
}

export function useDeleteObjectView() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { id: string; object_id: string }) => {
      const { error } = await (supabase
        .from("core_object_views")
        .delete() as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["core-object-views", currentWorkspace?.id, v.object_id] });
      toast.success("View removida");
    },
    onError: () => toast.error("Erro ao remover view"),
  });
}
