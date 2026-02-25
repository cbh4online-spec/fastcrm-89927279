import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SavedView {
  id: string;
  workspace_id: string;
  name: string;
  entity_type: string;
  filters: Record<string, unknown> | null;
  sort_config: Record<string, unknown> | null;
  visible_columns: string[] | null;
  view_mode: string;
  is_default: boolean;
  is_favorite: boolean;
  position: number;
  user_id: string | null;
  created_at: string;
  icon: string | null;
}

export function useSavedViews(entityType: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["saved-views", currentWorkspace?.id, entityType],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await (supabase
        .from("crm_saved_views")
        .select("*") as any)
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .order("name");
      if (error) throw error;
      return (data || []) as SavedView[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      entity_type: string;
      filters?: Record<string, unknown>;
      sort_config?: Record<string, unknown>;
      visible_columns?: string[];
      view_mode?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await (supabase
        .from("crm_saved_views")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          entity_type: input.entity_type as any,
          filters: input.filters || null,
          sort_config: input.sort_config || null,
          visible_columns: input.visible_columns || null,
          view_mode: (input.view_mode || "table") as any,
          user_id: userId,
        } as any) as any)
        .select()
        .single();
      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", currentWorkspace?.id, vars.entity_type] });
      toast.success("View saved");
    },
    onError: () => toast.error("Failed to save view"),
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; entity_type: string }) => {
      const { error } = await (supabase
        .from("crm_saved_views")
        .delete() as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", currentWorkspace?.id, vars.entity_type] });
      toast.success("View deleted");
    },
    onError: () => toast.error("Failed to delete view"),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; entity_type: string; is_favorite: boolean }) => {
      const { error } = await (supabase
        .from("crm_saved_views")
        .update({ is_favorite: input.is_favorite } as any) as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", currentWorkspace?.id, vars.entity_type] });
    },
    onError: () => toast.error("Failed to update favorite"),
  });
}

export function useUpdateSavedView() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { id: string; entity_type: string; updates: Partial<Pick<SavedView, "name" | "icon" | "filters" | "sort_config" | "visible_columns">> }) => {
      const { error } = await (supabase
        .from("crm_saved_views")
        .update(input.updates as any) as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", currentWorkspace?.id, vars.entity_type] });
      toast.success("View updated");
    },
    onError: () => toast.error("Failed to update view"),
  });
}

export function useDuplicateSavedView() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { view: SavedView }) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { view } = input;
      const { data, error } = await (supabase
        .from("crm_saved_views")
        .insert({
          workspace_id: currentWorkspace.id,
          name: `${view.name} (copy)`,
          entity_type: view.entity_type as any,
          filters: view.filters || null,
          sort_config: view.sort_config || null,
          visible_columns: view.visible_columns || null,
          view_mode: (view.view_mode || "table") as any,
          icon: view.icon || null,
          is_default: false,
          is_favorite: false,
          user_id: userId,
        } as any) as any)
        .select()
        .single();
      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", currentWorkspace?.id, vars.view.entity_type] });
      toast.success("View duplicated");
    },
    onError: () => toast.error("Failed to duplicate view"),
  });
}
