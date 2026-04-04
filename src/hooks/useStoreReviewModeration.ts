import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface StoreReviewMod {
  id: string;
  workspace_id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  moderated_by: string | null;
  moderated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  product_name?: string;
}

export function useStoreReviewModeration(statusFilter: "pending" | "approved" | "rejected" | "all" = "all") {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["store-reviews-moderation", currentWorkspace?.id, statusFilter],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("store_reviews")
        .select("*, store_products!inner(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (statusFilter === "pending") {
        query = query.eq("is_approved", false).is("moderated_at", null);
      } else if (statusFilter === "approved") {
        query = query.eq("is_approved", true);
      } else if (statusFilter === "rejected") {
        query = query.eq("is_approved", false).not("moderated_at", "is", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        product_name: r.store_products?.name || "Produto removido",
        store_products: undefined,
      })) as StoreReviewMod[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("store_reviews")
        .update({
          is_approved: true,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-reviews-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["store-reviews"] });
      toast.success("Avaliação aprovada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("store_reviews")
        .update({
          is_approved: false,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-reviews-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["store-reviews"] });
      toast.success("Avaliação rejeitada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("store_reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-reviews-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["store-reviews"] });
      toast.success("Avaliação eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
