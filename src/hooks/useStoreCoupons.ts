import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StoreCoupon {
  id: string;
  workspace_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  single_use_per_customer: boolean;
  category_ids: string[] | null;
  max_discount_amount: number | null;
  description: string | null;
}

export function useStoreCoupons() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-coupons", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("store_coupons")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreCoupon[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateStoreCoupon() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (coupon: {
      code: string;
      discount_type: "percentage" | "fixed";
      discount_value: number;
      min_order_amount?: number;
      max_uses?: number | null;
      valid_until?: string | null;
      single_use_per_customer?: boolean;
      category_ids?: string[] | null;
      max_discount_amount?: number | null;
      description?: string | null;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase.from("store_coupons").insert({
        workspace_id: currentWorkspace.id,
        code: coupon.code.toUpperCase().trim(),
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount || 0,
        max_uses: coupon.max_uses || null,
        valid_until: coupon.valid_until || null,
        single_use_per_customer: coupon.single_use_per_customer || false,
        category_ids: coupon.category_ids?.length ? coupon.category_ids : null,
        max_discount_amount: coupon.max_discount_amount || null,
        description: coupon.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-coupons"] });
      toast.success("Cupão criado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("store_coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-coupons"] });
    },
  });
}

export function useDeleteStoreCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-coupons"] });
      toast.success("Cupão eliminado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
