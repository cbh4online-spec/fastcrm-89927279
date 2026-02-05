import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientPriceTier, ProductTierPrice } from "@/types/pricing-tier";
import { getEffectivePrice } from "@/types/pricing-tier";

/**
 * Hook to get pricing information for a contact based on their price tier
 * Used in proposals and CRM to apply contact-specific discounts
 */
export function useContactPricing(contactId: string | undefined) {
  // Fetch contact's price tier
  const { data: contactTier, isLoading } = useQuery({
    queryKey: ["contact-pricing", contactId],
    queryFn: async () => {
      if (!contactId) return null;

      // First get the contact's price_tier_id
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("price_tier_id")
        .eq("id", contactId)
        .single();

      if (contactError || !contact?.price_tier_id) return null;

      // Then fetch the tier details
      const { data: tier, error: tierError } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", contact.price_tier_id)
        .single();

      if (tierError) return null;
      return tier as ClientPriceTier;
    },
    enabled: !!contactId,
  });

  // Function to get effective price for a product (async - checks for specific tier prices)
  const getProductPrice = async (productId: string, basePrice: number): Promise<number> => {
    if (!contactTier || !contactTier.is_active) return basePrice;

    // Check for specific tier price for this product
    const { data: tierPrice } = await supabase
      .from("product_tier_prices")
      .select("*")
      .eq("product_id", productId)
      .eq("tier_id", contactTier.id)
      .eq("is_active", true)
      .maybeSingle();

    return getEffectivePrice(basePrice, contactTier, tierPrice as ProductTierPrice | null);
  };

  // Sync function for immediate use (uses cached tier only, applies general discount)
  const getProductPriceSync = (basePrice: number): number => {
    if (!contactTier || !contactTier.is_active) return basePrice;
    
    // Apply tier discount percentage
    if (contactTier.discount_percentage > 0) {
      return basePrice * (1 - contactTier.discount_percentage / 100);
    }
    
    return basePrice;
  };

  // Calculate savings for display
  const calculateSavings = (basePrice: number): { amount: number; percentage: number } => {
    if (!contactTier || !contactTier.is_active || contactTier.discount_percentage <= 0) {
      return { amount: 0, percentage: 0 };
    }
    
    const discountedPrice = getProductPriceSync(basePrice);
    return {
      amount: basePrice - discountedPrice,
      percentage: contactTier.discount_percentage,
    };
  };

  return {
    tier: contactTier,
    loading: isLoading,
    discountPercentage: contactTier?.discount_percentage || 0,
    tierName: contactTier?.name || null,
    tierColor: contactTier?.color || null,
    hasTier: !!contactTier?.is_active,
    getProductPrice,
    getProductPriceSync,
    calculateSavings,
  };
}

/**
 * Hook to get pricing for a client user in the B2B portal
 * Uses the client_user's price_tier_id
 */
export function useClientUserPricing(clientUserId: string | undefined) {
  // Fetch client user's price tier
  const { data: tierData, isLoading } = useQuery({
    queryKey: ["client-user-pricing", clientUserId],
    queryFn: async () => {
      if (!clientUserId) return null;

      // Get the client user's price_tier_id
      const { data: clientUser, error: clientError } = await supabase
        .from("client_users")
        .select("price_tier_id")
        .eq("id", clientUserId)
        .single();

      if (clientError || !clientUser?.price_tier_id) return null;

      // Fetch the tier details
      const { data: tier, error: tierError } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", clientUser.price_tier_id)
        .single();

      if (tierError) return null;
      return tier as ClientPriceTier;
    },
    enabled: !!clientUserId,
  });

  // Get all tier prices for products at once for efficiency
  const { data: tierPrices = [] } = useQuery({
    queryKey: ["client-user-tier-prices", tierData?.id],
    queryFn: async () => {
      if (!tierData?.id) return [];

      const { data, error } = await supabase
        .from("product_tier_prices")
        .select("*")
        .eq("tier_id", tierData.id)
        .eq("is_active", true);

      if (error) return [];
      return data as ProductTierPrice[];
    },
    enabled: !!tierData?.id,
  });

  // Get effective price for a product (uses cached tier prices)
  const getProductPrice = (productId: string, basePrice: number): number => {
    if (!tierData || !tierData.is_active) return basePrice;

    // Check for specific tier price
    const tierPrice = tierPrices.find(tp => tp.product_id === productId);
    
    return getEffectivePrice(basePrice, tierData, tierPrice || null);
  };

  // Check if a product has a tier discount
  const hasDiscount = (productId: string, basePrice: number): boolean => {
    const effectivePrice = getProductPrice(productId, basePrice);
    return effectivePrice < basePrice;
  };

  return {
    tier: tierData,
    tierPrices,
    loading: isLoading,
    discountPercentage: tierData?.discount_percentage || 0,
    tierName: tierData?.name || null,
    tierColor: tierData?.color || null,
    hasTier: !!tierData?.is_active,
    getProductPrice,
    hasDiscount,
  };
}
