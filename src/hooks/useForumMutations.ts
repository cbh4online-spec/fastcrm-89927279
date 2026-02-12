import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCreateForumCategory(workspaceId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      icon,
      isPrivate,
      isReadOnly,
      isPaid,
      price,
      color,
    }: {
      name: string;
      description: string | null;
      icon: string;
      isPrivate: boolean;
      isReadOnly: boolean;
      isPaid: boolean;
      price: number | null;
      color: string | null;
    }) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("forum_categories")
        .insert({
          workspace_id: workspaceId,
          name,
          slug,
          description,
          icon,
          is_private: isPrivate,
          is_read_only: isReadOnly,
          is_paid: isPaid,
          price,
          color,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Canal criado!");
    },
    onError: () => toast.error("Erro ao criar canal"),
  });
}

export function useUpdateForumCategory(workspaceId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      icon,
      isPrivate,
      isReadOnly,
      isPaid,
      price,
      color,
    }: {
      id: string;
      name: string;
      description: string | null;
      icon: string;
      isPrivate: boolean;
      isReadOnly: boolean;
      isPaid: boolean;
      price: number | null;
      color: string | null;
    }) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("forum_categories")
        .update({
          name,
          slug,
          description,
          icon,
          is_private: isPrivate,
          is_read_only: isReadOnly,
          is_paid: isPaid,
          price,
          color,
        } as any)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Canal atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar canal"),
  });
}

export function useDeleteForumCategory(workspaceId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const { error } = await supabase
        .from("forum_categories")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Canal eliminado!");
    },
    onError: () => toast.error("Erro ao eliminar canal"),
  });
}
