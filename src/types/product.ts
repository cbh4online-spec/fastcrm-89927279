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
  operational_cost: number | null;
  commission_default: number | null;
  tax_rate_estimate_pct: number | null;
  target_margin_pct: number | null;
  images: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductWithMargins extends Product {
  gross_margin_value: number;
  gross_margin_pct: number;
  contribution_margin_value: number;
  contribution_margin_pct: number;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  product_id: string | null;
  workspace_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_snapshot: number | null;
  operational_cost_snapshot: number | null;
  commission_pct_snapshot: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductUsageStats {
  product_id: string;
  workspace_id: string;
  product_name: string;
  base_price: number;
  direct_cost: number | null;
  operational_cost: number | null;
  commission_default: number | null;
  total_proposals: number;
  accepted_proposals: number;
  published_proposals: number;
  total_revenue: number;
  revenue_30d: number;
  revenue_90d: number;
  revenue_1y: number;
  total_sales: number;
  sales_30d: number;
  avg_ticket: number;
  avg_margin_pct: number | null;
  total_commission: number;
  acceptance_rate: number;
  last_sale_at: string | null;
}

export interface ProductAlert {
  type: 'negative_margin' | 'below_target' | 'no_sales' | 'high_volume_low_margin';
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  productId: string;
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
  operational_cost?: number;
  commission_default?: number;
  tax_rate_estimate_pct?: number;
  target_margin_pct?: number;
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

// Margin calculation utilities
export function calculateProductMargins(product: Product): ProductWithMargins {
  const directCost = product.direct_cost ?? 0;
  const operationalCost = product.operational_cost ?? 0;
  const basePrice = product.base_price;

  const grossMarginValue = basePrice - directCost;
  const grossMarginPct = basePrice > 0 ? (grossMarginValue / basePrice) * 100 : 0;

  const contributionMarginValue = basePrice - directCost - operationalCost;
  const contributionMarginPct = basePrice > 0 ? (contributionMarginValue / basePrice) * 100 : 0;

  return {
    ...product,
    gross_margin_value: grossMarginValue,
    gross_margin_pct: grossMarginPct,
    contribution_margin_value: contributionMarginValue,
    contribution_margin_pct: contributionMarginPct,
  };
}

export function getMarginColor(marginPct: number, targetPct?: number | null): string {
  if (marginPct < 0) return 'text-destructive';
  if (targetPct && marginPct < targetPct) return 'text-yellow-600';
  if (marginPct >= 30) return 'text-green-600';
  if (marginPct >= 15) return 'text-yellow-600';
  return 'text-destructive';
}

export function getMarginBgColor(marginPct: number, targetPct?: number | null): string {
  if (marginPct < 0) return 'bg-destructive/20';
  if (targetPct && marginPct < targetPct) return 'bg-yellow-500/20';
  if (marginPct >= 30) return 'bg-green-500/20';
  if (marginPct >= 15) return 'bg-yellow-500/20';
  return 'bg-destructive/20';
}
