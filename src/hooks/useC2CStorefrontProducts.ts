import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches approved C2C listings with seller info and maps them to the
 * standard product format used by storefront components.
 */
export function useC2CStorefrontProducts(wsId: string, c2cEnabled: boolean) {
  const { data: c2cListings = [] } = useQuery({
    queryKey: ["c2c-listings-public", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_listings")
        .select("*, c2c_sellers!inner(id, display_name, slug, avatar_url, avg_rating)")
        .eq("workspace_id", wsId)
        .eq("status", "active")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId && c2cEnabled,
  });

  return useMemo(() => {
    if (!c2cEnabled) return [] as any[];
    return c2cListings.map((l: any) => ({
      id: l.id,
      name: l.title,
      base_price: Number(l.price),
      currency: l.currency || "EUR",
      images: l.photos || [],
      short_description: l.description?.slice(0, 120),
      category: null,
      stock_status: "in_stock",
      stock_quantity: null,
      track_stock: false,
      store_featured: l.is_featured || false,
      created_at: l.created_at,
      sku: null,
      billing_type: "one_time",
      primary_image_index: 0,
      product_condition: l.condition,
      workspace_id: wsId,
      _isC2C: true,
      _sellerId: l.c2c_sellers?.id,
      _sellerName: l.c2c_sellers?.display_name,
      _sellerSlug: l.c2c_sellers?.slug,
    }));
  }, [c2cListings, c2cEnabled, wsId]);
}
