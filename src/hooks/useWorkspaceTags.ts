import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkspaceTag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export function useWorkspaceTags() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-tags", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workspace_tags")
        .select("id, name, color, created_at")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name");
      if (error) throw error;
      return (data || []) as WorkspaceTag[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWorkspaceTag() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data, error } = await (supabase as any)
        .from("workspace_tags")
        .insert({
          workspace_id: currentWorkspace!.id,
          name: name.trim().toLowerCase(),
          color: color || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkspaceTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-tags", currentWorkspace?.id] });
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.info("Esta etiqueta já existe");
      } else {
        toast.error("Erro ao criar etiqueta");
      }
    },
  });
}

export function useUpdateWorkspaceTag() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string | null }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim().toLowerCase();
      if (color !== undefined) updates.color = color;
      const { error } = await (supabase as any)
        .from("workspace_tags")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-tags", currentWorkspace?.id] });
    },
    onError: () => toast.error("Erro ao atualizar etiqueta"),
  });
}

export function useDeleteWorkspaceTag() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("workspace_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-tags", currentWorkspace?.id] });
    },
    onError: () => toast.error("Erro ao eliminar etiqueta"),
  });
}

/** Sync: ensure all tags used in leads exist in the workspace_tags table */
export function useSyncLeadTagsToWorkspace() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tags: string[]) => {
      if (!tags.length || !currentWorkspace?.id) return;
      const uniqueTags = [...new Set(tags.map(t => t.trim().toLowerCase()))];
      for (const tag of uniqueTags) {
        await (supabase as any)
          .from("workspace_tags")
          .upsert(
            { workspace_id: currentWorkspace.id, name: tag },
            { onConflict: "workspace_id,name" }
          );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-tags", currentWorkspace?.id] });
    },
  });
}
