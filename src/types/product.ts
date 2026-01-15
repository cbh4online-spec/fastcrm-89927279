export type ProductType = 'simple' | 'recurring' | 'sessions' | 'composite';
export type ProductStatus = 'active' | 'archived';
export type BillingType = 'one-off' | 'recurring';

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  product_type: ProductType;
  status: ProductStatus;
  category: string | null;
  base_price: number;
  currency: string;
  billing_type: BillingType;
  short_description: string | null;
  sku: string | null;
  direct_cost: number | null;
  commission_default: number | null;
  images: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  product_type?: ProductType;
  status?: ProductStatus;
  category?: string;
  base_price: number;
  currency?: string;
  billing_type?: BillingType;
  short_description?: string;
  sku?: string;
  direct_cost?: number;
  commission_default?: number;
  images?: string[];
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export const productTypeLabels: Record<ProductType, string> = {
  simple: 'Simples',
  recurring: 'Recorrente',
  sessions: 'Sessões',
  composite: 'Composto',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  active: 'Ativo',
  archived: 'Arquivado',
};

export const billingTypeLabels: Record<BillingType, string> = {
  'one-off': 'Único',
  recurring: 'Recorrente',
};
