import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientPriceTier, ProductTierPrice } from "@/types/pricing-tier";

interface StoreTierPricing {
  tier: ClientPriceTier | null;
  tierPrices: Map<string, number>; // productId -> tier price
  isB2B: boolean;
}

/**
 * Hook to fetch B2B tier pricing for the store.
 * Checks if the current logged-in user is a client_user with a price_tier_id,
 * and loads their tier-specific prices.
 */
export function useStoreTierPricing(workspaceId: string) {
  return useQuery<StoreTierPricing>({
    queryKey: ["store-tier-pricing", workspaceId],
    queryFn: async () => {
      const empty: StoreTierPricing = { tier: null, tierPrices: new Map(), isB2B: false };

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return empty;

      // Check if user is a client_user with a tier
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("id, price_tier_id")
        .eq("auth_user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!clientUser?.price_tier_id) return empty;

      // Get tier details
      const { data: tier } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", clientUser.price_tier_id)
        .eq("is_active", true)
        .single();

      if (!tier) return empty;

      // Get all tier prices for this tier
      const { data: prices } = await supabase
        .from("product_tier_prices")
        .select("product_id, price_net, valid_from, valid_until, is_active")
        .eq("tier_id", tier.id)
        .eq("is_active", true);

      const tierPrices = new Map<string, number>();
      const now = new Date();

      for (const p of prices || []) {
        const validFrom = p.valid_from ? new Date(p.valid_from) : null;
        const validUntil = p.valid_until ? new Date(p.valid_until) : null;
        const isValid = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);
        if (isValid) {
          tierPrices.set(p.product_id, p.price_net);
        }
      }

      return {
        tier: tier as ClientPriceTier,
        tierPrices,
        isB2B: true,
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

/**
 * Get the effective price for a product considering tier pricing.
 */
export function getStorePrice(
  basePrice: number,
  productId: string,
  tierPricing?: StoreTierPricing | null
): { price: number; isDiscounted: boolean; discountLabel?: string } {
  if (!tierPricing?.isB2B || !tierPricing.tier) {
    return { price: basePrice, isDiscounted: false };
  }

  // Check for specific tier price
  const tierPrice = tierPricing.tierPrices.get(productId);
  if (tierPrice !== undefined) {
    return {
      price: tierPrice,
      isDiscounted: tierPrice < basePrice,
      discountLabel: tierPricing.tier.name,
    };
  }

  // Apply tier discount percentage
  if (tierPricing.tier.discount_percentage > 0) {
    const discounted = basePrice * (1 - tierPricing.tier.discount_percentage / 100);
    return {
      price: discounted,
      isDiscounted: true,
      discountLabel: `${tierPricing.tier.name} (-${tierPricing.tier.discount_percentage}%)`,
    };
  }

  return { price: basePrice, isDiscounted: false };
}
