import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SaasCategory {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  module_count?: number;
}

export interface CreateSaasCategoryInput {
  name: string;
  description?: string;
  color?: string;
  image_url?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateSaasCategoryInput extends Partial<CreateSaasCategoryInput> {
  id: string;
}

export function useSaasCategories() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["saas-categories", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_categories")
        .select("*")
        .or(`workspace_id.is.null,workspace_id.eq.${currentWorkspace?.id}`)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as SaasCategory[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSaasCategory(id: string | undefined) {
  return useQuery({
    queryKey: ["saas-category", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("saas_categories")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SaasCategory;
    },
    enabled: !!id,
  });
}

export function useCreateSaasCategory() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSaasCategoryInput) => {
      const { data, error } = await supabase
        .from("saas_categories")
        .insert({
          ...input,
          workspace_id: currentWorkspace?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SaasCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-categories"] });
      toast.success("Categoria SaaS criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });
}

export function useUpdateSaasCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSaasCategoryInput) => {
      const { data, error } = await supabase
        .from("saas_categories")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SaasCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saas-categories"] });
      queryClient.invalidateQueries({ queryKey: ["saas-category", data.id] });
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });
}

export function useDeleteSaasCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saas_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saas-categories"] });
      toast.success("Categoria eliminada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar categoria: " + error.message);
    },
  });
}
