import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export function useStoreReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["store-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("store_reviews")
        .select("id, product_id, user_id, rating, title, comment, is_verified_purchase, created_at")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreReview[];
    },
    enabled: !!productId,
  });
}

export function useStoreReviewStats(productId: string | undefined) {
  const { data: reviews } = useStoreReviews(productId);
  const count = reviews?.length || 0;
  const average = count > 0
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;
  return { average, count };
}

export function useAddStoreReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      product_id: string;
      workspace_id: string;
      rating: number;
      title?: string;
      comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Deve estar autenticado para avaliar");

      const { error } = await supabase
        .from("store_reviews")
        .insert({
          product_id: review.product_id,
          workspace_id: review.workspace_id,
          user_id: user.id,
          rating: review.rating,
          title: review.title || null,
          comment: review.comment || null,
        });
      if (error) {
        if (error.code === "23505") throw new Error("Já avaliou este produto");
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["store-reviews", variables.product_id] });
    },
  });
}

export function useStoreWishlist(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["store-wishlist", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workspaceId) return [];
      const { data, error } = await supabase
        .from("store_wishlist")
        .select("id, product_id, created_at")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, workspaceId, isInWishlist }: { productId: string; workspaceId: string; isInWishlist: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Deve estar autenticado");

      if (isInWishlist) {
        const { error } = await supabase
          .from("store_wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_wishlist")
          .insert({ user_id: user.id, product_id: productId, workspace_id: workspaceId });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist", variables.workspaceId] });
    },
  });
}

export function useStoreOrderHistory() {
  return useQuery({
    queryKey: ["store-order-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, order_number, status, items, subtotal, total, currency, created_at, paid_at, workspace_id, tracking_number, tracking_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
