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
      const { data: clientUser, error: clientErr } = await supabase
        .from("client_users")
        .select("id, price_tier_id")
        .eq("auth_user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (clientErr) {
        console.warn('[B2B-CATALOG] STORE_TIER_PRICING_FAILED:', clientErr.message);
        return empty;
      }

      if (!clientUser?.price_tier_id) return empty;

      // Get tier details
      const { data: tier, error: tierErr } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", clientUser.price_tier_id)
        .eq("is_active", true)
        .single();

      if (tierErr) {
        console.warn('[B2B-CATALOG] STORE_TIER_PRICING_FAILED:', tierErr.message);
        return empty;
      }

      if (!tier) return empty;

      // Get all tier prices for this tier
      const { data: prices, error: pricesErr } = await supabase
        .from("product_tier_prices")
        .select("product_id, price_net, valid_from, valid_until, is_active")
        .eq("tier_id", tier.id)
        .eq("is_active", true);

      if (pricesErr) {
        console.warn('[B2B-CATALOG] STORE_TIER_PRICING_FAILED:', pricesErr.message);
      }

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
 * Check if a product is currently on an active promotion.
 */
function isPromoActive(product: { compare_at_price?: number | null; promo_start_at?: string | null; promo_end_at?: string | null }): boolean {
  if (!product.compare_at_price) return false;
  const now = new Date();
  if (product.promo_start_at && now < new Date(product.promo_start_at)) return false;
  if (product.promo_end_at && now > new Date(product.promo_end_at)) return false;
  return true;
}

export interface StorePriceResult {
  price: number;
  isDiscounted: boolean;
  discountLabel?: string;
  isPromo?: boolean;
  compareAtPrice?: number;
  lowestPrice30d?: number;
  promoLabel?: string | null;
  promoEndAt?: string | null;
  savingsPercent?: number;
}

/**
 * Get the effective price for a product considering tier pricing AND promotions.
 * Priority: B2B tier pricing > active promotion > base price.
 */
export function getStorePrice(
  basePrice: number,
  productId: string,
  tierPricing?: StoreTierPricing | null,
  product?: { compare_at_price?: number | null; promo_start_at?: string | null; promo_end_at?: string | null; promo_label?: string | null; lowest_price_30d?: number | null }
): StorePriceResult {
  // B2B tier pricing takes priority
  if (tierPricing?.isB2B && tierPricing.tier) {
    const tierPrice = tierPricing.tierPrices.get(productId);
    if (tierPrice !== undefined) {
      return {
        price: tierPrice,
        isDiscounted: tierPrice < basePrice,
        discountLabel: tierPricing.tier.name,
      };
    }

    if (tierPricing.tier.discount_percentage > 0) {
      const discounted = basePrice * (1 - tierPricing.tier.discount_percentage / 100);
      return {
        price: discounted,
        isDiscounted: true,
        discountLabel: `${tierPricing.tier.name} (-${tierPricing.tier.discount_percentage}%)`,
      };
    }
  }

  // Check for active promotion (Omnibus Directive compliant)
  if (product && isPromoActive(product)) {
    const omnibusRef = product.lowest_price_30d ?? product.compare_at_price!;
    const savingsPercent = omnibusRef > 0 ? Math.round(((omnibusRef - basePrice) / omnibusRef) * 100) : 0;

    return {
      price: basePrice,
      isDiscounted: true,
      isPromo: true,
      compareAtPrice: product.compare_at_price!,
      lowestPrice30d: omnibusRef,
      promoLabel: product.promo_label,
      promoEndAt: product.promo_end_at,
      savingsPercent: Math.max(savingsPercent, 0),
    };
  }

  return { price: basePrice, isDiscounted: false };
}
