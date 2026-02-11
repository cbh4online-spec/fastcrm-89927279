import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Seller listings
export function useSellerListings(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-listings", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("id, title, price, status, condition, photos, views_count, created_at, currency")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}

// Seller commissions/sales
export function useSellerCommissions(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-commissions", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_commissions")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}

// Seller reviews
export function useSellerReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-reviews", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}

// Seller notes (admin internal)
export function useSellerNotes(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-notes", sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("c2c_seller_notes")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}

// Add seller note
export function useAddSellerNote() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sellerId, note }: { sellerId: string; note: string }) => {
      if (!user) throw new Error("Sem utilizador");
      const { error } = await supabase.from("c2c_seller_notes").insert({
        seller_id: sellerId,
        admin_id: user.id,
        note,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-notes", vars.sellerId] });
      toast.success("Nota adicionada");
    },
    onError: () => toast.error("Erro ao adicionar nota"),
  });
}

// Update seller details (commission, verification, bank, reactivate)
export function useUpdateSellerDetails() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sellerId, updates }: {
      sellerId: string;
      updates: {
        commission_rate?: number;
        is_verified?: boolean;
        iban?: string;
        bank_name?: string;
        account_holder?: string;
        status?: "pending" | "approved" | "rejected" | "suspended";
      };
    }) => {
      const { error } = await supabase
        .from("c2c_sellers")
        .update(updates)
        .eq("id", sellerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-sellers"] });
      qc.invalidateQueries({ queryKey: ["c2c-my-seller"] });
      toast.success("Vendedor atualizado");
    },
    onError: () => toast.error("Erro ao atualizar vendedor"),
  });
}

// Bulk update sellers
export function useBulkUpdateSellers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sellerIds, updates }: {
      sellerIds: string[];
      updates: { status?: "pending" | "approved" | "rejected" | "suspended" };
    }) => {
      const { error } = await supabase
        .from("c2c_sellers")
        .update(updates)
        .in("id", sellerIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-sellers"] });
      toast.success("Vendedores atualizados em massa");
    },
    onError: () => toast.error("Erro na atualização em massa"),
  });
}
