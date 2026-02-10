import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CSponsoredListing {
  id: string;
  workspace_id: string;
  listing_id: string;
  seller_id: string;
  amount_paid: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  stripe_payment_id: string | null;
  created_at: string;
}

export interface C2CSellerSubscription {
  id: string;
  workspace_id: string;
  seller_id: string;
  plan: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  price_amount: number;
  currency: string;
  features: Record<string, unknown> | null;
  created_at: string;
}

// Get active sponsored listings for marketplace display
export function useC2CSponsoredListings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-sponsored", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("c2c_sponsored_listings")
        .select("listing_id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now);
      if (error) throw error;
      return (data || []).map((d) => d.listing_id);
    },
    enabled: !!workspaceId,
  });
}

// Get seller's active subscription
export function useMySellerSubscription(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-subscription", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return null;
      // First get seller id
      const { data: seller } = await supabase
        .from("c2c_sellers")
        .select("id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!seller) return null;

      const { data, error } = await supabase
        .from("c2c_seller_subscriptions")
        .select("*")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as C2CSellerSubscription | null;
    },
    enabled: !!workspaceId && !!user,
  });
}

// Get seller's boost history
export function useMyBoosts(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-boosts", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data: seller } = await supabase
        .from("c2c_sellers")
        .select("id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!seller) return [];

      const { data, error } = await supabase
        .from("c2c_sponsored_listings")
        .select("*")
        .eq("seller_id", seller.id)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2CSponsoredListing[];
    },
    enabled: !!workspaceId && !!user,
  });
}

// Boost a listing
export function useBoostListing() {
  return useMutation({
    mutationFn: async ({ workspaceId, listingId, duration }: {
      workspaceId: string;
      listingId: string;
      duration: "7days" | "14days" | "30days";
    }) => {
      const { data, error } = await supabase.functions.invoke("create-c2c-boost-checkout", {
        body: { type: "boost", workspaceId, listingId, boostDuration: duration },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar boost");
    },
  });
}

// Subscribe to premium
export function useSubscribePremium() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("create-c2c-boost-checkout", {
        body: { type: "premium", workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      qc.invalidateQueries({ queryKey: ["c2c-my-subscription"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao subscrever premium");
    },
  });
}
