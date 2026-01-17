import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ProductCategory {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateProductCategoryInput extends Partial<CreateProductCategoryInput> {
  id: string;
}

export function useProductCategoriesList() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-categories", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ProductCategory[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useProductCountByCategory() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-count-by-category", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return {};

      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", currentWorkspace.id)
        .not("category", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((product) => {
        if (product.category) {
          counts[product.category] = (counts[product.category] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateProductCategoryInput) => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilizador não autenticado. Por favor, faça login novamente.");
      }

      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado. Por favor, selecione um workspace.");
      }

      // Verify user has access to this workspace
      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) {
        console.error("Error checking membership:", membershipError);
        throw new Error("Erro ao verificar permissões");
      }

      if (!membership) {
        throw new Error("Não tem permissões para criar categorias neste workspace");
      }

      const { data, error } = await supabase
        .from("product_categories")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating category:", error);
        throw error;
      }
      return data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Já existe uma categoria com este nome");
      } else if (error.message.includes("row-level security")) {
        toast.error("Sem permissões. Por favor, faça login novamente.");
      } else {
        toast.error("Erro ao criar categoria: " + error.message);
      }
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductCategoryInput) => {
      const { data, error } = await supabase
        .from("product_categories")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Já existe uma categoria com este nome");
      } else {
        toast.error("Erro ao atualizar categoria: " + error.message);
      }
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoria eliminada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar categoria: " + error.message);
    },
  });
}

export function useReorderProductCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: { id: string; position: number }[]) => {
      const updates = categories.map(({ id, position }) =>
        supabase
          .from("product_categories")
          .update({ position, updated_at: new Date().toISOString() })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error("Erro ao reordenar categorias");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    },
    onError: (error) => {
      toast.error("Erro ao reordenar categorias: " + error.message);
    },
  });
}
