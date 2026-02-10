import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface AdminStoreCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

export function useAdminStoreCategories() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["admin-store-categories", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_categories")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminStoreCategory[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateStoreCategory() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (cat: { name: string; slug: string; description?: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase.from("store_categories").insert({
        workspace_id: currentWorkspace.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
      toast.success("Categoria criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useToggleStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("store_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
    },
  });
}

export function useDeleteStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
      toast.success("Categoria eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
