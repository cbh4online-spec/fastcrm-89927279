// Types for Acquired Products (Produtos Adquiridos)

export type AcquiredProductStatus = 'ativo' | 'em_consumo' | 'concluido' | 'expirado';

export const ACQUIRED_PRODUCT_STATUS_LABELS: Record<AcquiredProductStatus, string> = {
  ativo: 'Ativo',
  em_consumo: 'Em Consumo',
  concluido: 'Concluído',
  expirado: 'Expirado',
};

export const ACQUIRED_PRODUCT_STATUS_COLORS: Record<AcquiredProductStatus, string> = {
  ativo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  em_consumo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  concluido: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  expirado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export interface AcquiredProduct {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  product_id: string;
  workspace_id: string;
  quantity: number | null;
  purchased_quantity: number | null;
  consumed_quantity: number | null;
  unit_price: number | null;
  total_value: number | null;
  acquisition_date: string | null;
  expiry_date: string | null;
  status: AcquiredProductStatus | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined product data
  product?: {
    id: string;
    name: string;
    price: number | null;
    category: string | null;
    product_type: string | null;
    consumption_model: string | null;
    included_quantity: number | null;
    recommended_frequency: string | null;
    typical_duration_days: number | null;
    is_trackable: boolean | null;
  };
}

export interface CreateAcquiredProductInput {
  contactId?: string;
  companyId?: string;
  productId: string;
  purchasedQuantity?: number;
  unitPrice?: number;
  acquisitionDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateAcquiredProductInput {
  id: string;
  consumedQuantity?: number;
  status?: AcquiredProductStatus;
  notes?: string;
  expiryDate?: string;
}

// Helper to calculate consumption percentage
export function getConsumptionPercentage(product: AcquiredProduct): number {
  const total = product.purchased_quantity || product.quantity || 1;
  const consumed = product.consumed_quantity || 0;
  return Math.min(100, Math.round((consumed / total) * 100));
}

// Helper to get remaining quantity
export function getRemainingQuantity(product: AcquiredProduct): number {
  const total = product.purchased_quantity || product.quantity || 0;
  const consumed = product.consumed_quantity || 0;
  return Math.max(0, total - consumed);
}
