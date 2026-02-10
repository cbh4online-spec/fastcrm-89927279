import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ProductVariant {
  id: string;
  product_id: string;
  workspace_id: string;
  name: string;
  sku: string | null;
  price_override: number | null;
  stock_quantity: number;
  track_stock: boolean;
  attributes: Record<string, string>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useProductVariants(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order");
      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variant: Omit<ProductVariant, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("product_variants")
        .insert(variant as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-variants", vars.product_id] });
      toast.success("Variante criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductVariant> & { id: string; product_id: string }) => {
      const { data, error } = await supabase
        .from("product_variants")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-variants", vars.product_id] });
      toast.success("Variante atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
      return product_id;
    },
    onSuccess: (productId) => {
      qc.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success("Variante removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Public hook for storefront
export function usePublicProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: ["public-product-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });
}
