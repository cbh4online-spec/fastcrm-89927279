// Types for Client Price Tiers

export interface ClientPriceTier {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  description: string | null;
  discount_percentage: number;
  color: string;
  priority: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTierPrice {
  id: string;
  workspace_id: string;
  product_id: string;
  tier_id: string;
  price_net: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  // Joined data
  tier?: ClientPriceTier;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
  };
}

export interface CreatePriceTierData {
  workspace_id: string;
  name: string;
  code: string;
  description?: string;
  discount_percentage?: number;
  color?: string;
  priority?: number;
  is_default?: boolean;
}

export interface UpdatePriceTierData {
  name?: string;
  description?: string;
  discount_percentage?: number;
  color?: string;
  priority?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface SetTierPriceData {
  workspace_id: string;
  product_id: string;
  tier_id: string;
  price_net: number;
  valid_from?: string;
  valid_until?: string;
}

// Business type options for clients
export const businessTypeOptions = [
  { value: 'salon', label: 'Cabeleireiro/Salão' },
  { value: 'clinic', label: 'Clínica' },
  { value: 'therapist', label: 'Terapeuta' },
  { value: 'spa', label: 'SPA' },
  { value: 'pharmacy', label: 'Farmácia' },
  { value: 'retailer', label: 'Revenda' },
  { value: 'distributor', label: 'Distribuidor' },
  { value: 'other', label: 'Outro' },
] as const;

export type BusinessType = typeof businessTypeOptions[number]['value'];

// Tier color presets
export const tierColorPresets = [
  { name: 'Gold', color: '#f59e0b' },
  { name: 'Silver', color: '#9ca3af' },
  { name: 'Bronze', color: '#d97706' },
  { name: 'Platinum', color: '#6366f1' },
  { name: 'Diamond', color: '#0ea5e9' },
] as const;

// Helper to get effective price for a client
export function getEffectivePrice(
  basePrice: number,
  tier: ClientPriceTier | null,
  tierPrice: ProductTierPrice | null
): number {
  // If there's a specific tier price, use it
  if (tierPrice?.is_active) {
    const now = new Date();
    const validFrom = tierPrice.valid_from ? new Date(tierPrice.valid_from) : null;
    const validUntil = tierPrice.valid_until ? new Date(tierPrice.valid_until) : null;
    
    const isValidPeriod = 
      (!validFrom || now >= validFrom) && 
      (!validUntil || now <= validUntil);
    
    if (isValidPeriod) {
      return tierPrice.price_net;
    }
  }
  
  // Otherwise, apply tier discount percentage
  if (tier?.is_active && tier.discount_percentage > 0) {
    return basePrice * (1 - tier.discount_percentage / 100);
  }
  
  return basePrice;
}

// Format tier badge style
export function getTierBadgeStyle(tier: ClientPriceTier) {
  return {
    backgroundColor: `${tier.color}20`,
    color: tier.color,
    borderColor: `${tier.color}40`,
  };
}
