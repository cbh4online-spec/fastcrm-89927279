import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CReview {
  id: string;
  workspace_id: string;
  listing_id: string;
  seller_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// Get reviews for a listing
export function useListingReviews(listingId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-reviews-listing", listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("c2c_reviews")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as C2CReview[];
    },
    enabled: !!listingId,
  });
}

// Get reviews for a seller
export function useSellerReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-reviews-seller", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as C2CReview[];
    },
    enabled: !!sellerId,
  });
}

// Submit a review
export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspace_id: string;
      listing_id: string;
      seller_id: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("c2c_reviews").insert({
        workspace_id: data.workspace_id,
        listing_id: data.listing_id,
        seller_id: data.seller_id,
        rating: data.rating,
        comment: data.comment || null,
        reviewer_id: user.id,
      });
      if (error) {
        if (error.message?.includes("duplicate")) throw new Error("Já avaliaste este artigo");
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["c2c-reviews-listing", vars.listing_id] });
      qc.invalidateQueries({ queryKey: ["c2c-reviews-seller", vars.seller_id] });
      toast.success("Avaliação submetida!");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao submeter avaliação"),
  });
}
