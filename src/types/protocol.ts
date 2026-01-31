// Types for Product Protocols (Bundles/Kits)

export interface ProductProtocol {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  is_active: boolean;
  discount_percentage: number;
  category: string | null;
  tags: string[] | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  products?: ProtocolProduct[];
}

export interface ProtocolProduct {
  id: string;
  protocol_id: string;
  product_id: string;
  quantity: number;
  is_optional: boolean;
  notes: string | null;
  position: number;
  created_at: string;
  // Joined product data
  product?: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number;
    images: string[] | null;
    stock_status: string;
  };
}

export interface CreateProtocolData {
  workspace_id: string;
  name: string;
  code: string;
  description?: string;
  short_description?: string;
  image_url?: string;
  discount_percentage?: number;
  category?: string;
  tags?: string[];
}

export interface UpdateProtocolData {
  name?: string;
  description?: string;
  short_description?: string;
  image_url?: string;
  is_active?: boolean;
  discount_percentage?: number;
  category?: string;
  tags?: string[];
  position?: number;
}

export interface AddProtocolProductData {
  protocol_id: string;
  product_id: string;
  quantity?: number;
  is_optional?: boolean;
  notes?: string;
  position?: number;
}

// Cross-sell types
export interface ProductCrossSell {
  id: string;
  workspace_id: string;
  source_product_id: string;
  target_product_id: string;
  weight: number;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  // Joined product data
  target_product?: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number;
    images: string[] | null;
  };
}

export interface CreateCrossSellData {
  workspace_id: string;
  source_product_id: string;
  target_product_id: string;
  weight?: number;
  reason?: string;
}

// Helper to calculate protocol total
export function calculateProtocolTotal(
  products: ProtocolProduct[],
  discountPercentage: number = 0
): { subtotal: number; discount: number; total: number } {
  const subtotal = products.reduce((sum, pp) => {
    const price = pp.product?.base_price || 0;
    return sum + (price * pp.quantity);
  }, 0);
  
  const discount = subtotal * (discountPercentage / 100);
  const total = subtotal - discount;
  
  return { subtotal, discount, total };
}
