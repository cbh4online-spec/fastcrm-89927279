import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/product";

// Helper function to ensure category exists in product_categories table
async function ensureCategoryExists(categoryName: string | undefined, workspaceId: string): Promise<void> {
  if (!categoryName || !categoryName.trim()) return;

  const trimmedName = categoryName.trim();

  // Check if category already exists
  const { data: existingCategory } = await supabase
    .from("product_categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", trimmedName)
    .maybeSingle();

  // If category doesn't exist, create it
  if (!existingCategory) {
    const { error } = await supabase
      .from("product_categories")
      .insert({
        name: trimmedName,
        workspace_id: workspaceId,
        is_active: true,
      });

    if (error && !error.message.includes("duplicate")) {
      console.warn("Failed to create category:", error);
    }
  }
}

export function useProducts(filters?: {
  status?: string;
  productType?: string;
  category?: string;
  search?: string;
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["products", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("updated_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.productType && filters.productType !== "all") {
        query = query.eq("product_type", filters.productType);
      }

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useProduct(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      // Ensure category exists in product_categories table
      await ensureCategoryExists(input.category, currentWorkspace.id);

      const { data, error } = await supabase
        .from("products")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput) => {
      // Ensure category exists if being updated
      if (input.category && currentWorkspace?.id) {
        await ensureCategoryExists(input.category, currentWorkspace.id);
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are explicitly provided
      if (input.name !== undefined) updateData.name = input.name;
      if (input.product_type !== undefined) updateData.product_type = input.product_type;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.base_price !== undefined) updateData.base_price = input.base_price;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.billing_type !== undefined) updateData.billing_type = input.billing_type;
      if (input.short_description !== undefined) updateData.short_description = input.short_description;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.direct_cost !== undefined) updateData.direct_cost = input.direct_cost;
      if (input.operational_cost !== undefined) updateData.operational_cost = input.operational_cost;
      if (input.commission_default !== undefined) updateData.commission_default = input.commission_default;
      if (input.tax_rate_estimate_pct !== undefined) updateData.tax_rate_estimate_pct = input.tax_rate_estimate_pct;
      if (input.target_margin_pct !== undefined) updateData.target_margin_pct = input.target_margin_pct;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.bundle_price_mode !== undefined) updateData.bundle_price_mode = input.bundle_price_mode;
      if (input.total_units !== undefined) updateData.total_units = input.total_units;
      if (input.unit_name !== undefined) updateData.unit_name = input.unit_name;
      if (input.setup_fee !== undefined) updateData.setup_fee = input.setup_fee;
      if (input.recurring_fee !== undefined) updateData.recurring_fee = input.recurring_fee;
      // Consumption model fields
      if (input.consumption_model !== undefined) updateData.consumption_model = input.consumption_model;
      if (input.included_quantity !== undefined) updateData.included_quantity = input.included_quantity;
      if (input.recommended_frequency !== undefined) updateData.recommended_frequency = input.recommended_frequency;
      if (input.typical_duration_days !== undefined) updateData.typical_duration_days = input.typical_duration_days;
      if (input.is_trackable !== undefined) updateData.is_trackable = input.is_trackable;

      const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data, error } = await supabase
        .from("products")
        .update({
          status: archive ? "archived" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      toast.success(
        data.status === "archived"
          ? "Produto arquivado com sucesso!"
          : "Produto reativado com sucesso!"
      );
    },
    onError: (error) => {
      toast.error("Erro ao arquivar produto: " + error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Produto eliminado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar produto: " + error.message);
    },
  });
}

export function useProductCategories() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-categories", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", currentWorkspace.id)
        .not("category", "is", null);

      if (error) throw error;

      const categories = [...new Set(data.map((p) => p.category).filter(Boolean))] as string[];
      return categories.sort();
    },
    enabled: !!currentWorkspace?.id,
  });
}
