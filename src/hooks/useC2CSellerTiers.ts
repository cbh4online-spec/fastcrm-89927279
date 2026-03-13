import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supabase = _supabase as any;

export function useSellerTiers(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-seller-tiers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_seller_tiers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("price_monthly", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertSellerTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tier: {
      id?: string;
      workspace_id: string;
      tier_name: string;
      max_active_listings: number;
      max_photos_per_listing: number;
      commission_rate: number;
      features?: Record<string, any>;
      price_monthly?: number;
    }) => {
      if (tier.id) {
        const { id, ...rest } = tier;
        const { error } = await supabase.from("c2c_seller_tiers").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("c2c_seller_tiers").insert(tier);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-tiers"] });
      toast.success("Tier atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSellerTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase.from("c2c_seller_tiers").delete().eq("id", tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-tiers"] });
      toast.success("Tier removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSellerTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sellerId, tier, maxListings, maxPhotos }: {
      sellerId: string; tier: string; maxListings: number; maxPhotos: number;
    }) => {
      const { error } = await supabase
        .from("c2c_sellers")
        .update({ tier, max_active_listings: maxListings, max_photos_per_listing: maxPhotos })
        .eq("id", sellerId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-sellers"] });
      toast.success("Tier do vendedor atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
