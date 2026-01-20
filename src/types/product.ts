export type ProductType = 'simple' | 'recurring' | 'sessions' | 'composite' | 'formacao' | 'programa' | 'physical';
export type ProductStatus = 'active' | 'archived';
export type BillingType = 'one-off' | 'recurring';
export type BundlePriceMode = 'auto' | 'manual';
export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly';
export type DeliveryMode = 'online' | 'presencial' | 'hybrid';
export type EntitlementStatus = 'active' | 'completed' | 'expired' | 'cancelled';
export type ConsumptionModel = 'sessions' | 'units' | 'time' | 'free';
export type RecommendedFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type CycleTriggerType = 'days_after_purchase' | 'days_without_session' | 'consumption_percent' | 'days_before_expiry' | 'custom';
export type CycleActionType = 'create_task' | 'send_email' | 'send_whatsapp' | 'create_opportunity' | 'notify_owner' | 'start_automation';
export type ProgressionAction = 'task' | 'opportunity' | 'campaign' | 'automation';

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
  // Phase B fields
  total_units: number | null;
  unit_name: string | null;
  unit_duration: number | null;
  validity_days: number | null;
  delivery_mode: string | null;
  setup_fee: number | null;
  recurring_fee: number | null;
  billing_frequency: string | null;
  bundle_price_mode: string | null;
  commercial_description: string | null;
  benefits: string[] | null;
  conditions: string | null;
  sheet_published: boolean | null;
  sheet_slug: string | null;
  primary_image_index: number | null;
  // Consumption model fields
  consumption_model: ConsumptionModel | null;
  included_quantity: number | null;
  recommended_frequency: RecommendedFrequency | null;
  typical_duration_days: number | null;
  is_trackable: boolean | null;
  // Technical specifications
  specifications: Record<string, string> | null;
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
  // Phase B fields
  total_units?: number;
  unit_name?: string;
  unit_duration?: number;
  validity_days?: number;
  delivery_mode?: string;
  setup_fee?: number;
  recurring_fee?: number;
  billing_frequency?: string;
  bundle_price_mode?: string;
  commercial_description?: string;
  benefits?: string[];
  conditions?: string;
  sheet_published?: boolean;
  sheet_slug?: string;
  // Consumption model fields
  consumption_model?: ConsumptionModel;
  included_quantity?: number;
  recommended_frequency?: RecommendedFrequency;
  typical_duration_days?: number;
  is_trackable?: boolean;
  // Technical specifications
  specifications?: Record<string, string>;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export const productTypeLabels: Record<ProductType, string> = {
  simple: 'Simples',
  recurring: 'Recorrente',
  sessions: 'Sessões',
  composite: 'Composto',
  formacao: 'Formação',
  programa: 'Programa / Pack',
  physical: 'Produto Físico',
};

export const consumptionModelLabels: Record<ConsumptionModel, string> = {
  sessions: 'Sessões',
  units: 'Unidades',
  time: 'Tempo',
  free: 'Livre',
};

export const recommendedFrequencyLabels: Record<RecommendedFrequency, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  active: 'Ativo',
  archived: 'Arquivado',
};

export const billingTypeLabels: Record<BillingType, string> = {
  'one-off': 'Único',
  recurring: 'Recorrente',
};

export const billingFrequencyLabels: Record<BillingFrequency, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

export const deliveryModeLabels: Record<DeliveryMode, string> = {
  online: 'Online',
  presencial: 'Presencial',
  hybrid: 'Híbrido',
};

export const entitlementStatusLabels: Record<EntitlementStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

export const cycleTriggerLabels: Record<CycleTriggerType, string> = {
  days_after_purchase: 'Dias após compra',
  days_without_session: 'Dias sem sessão',
  consumption_percent: '% de consumo',
  days_before_expiry: 'Dias antes de expirar',
  custom: 'Personalizado',
};

export const cycleActionLabels: Record<CycleActionType, string> = {
  create_task: 'Criar tarefa',
  send_email: 'Enviar email',
  send_whatsapp: 'Enviar WhatsApp',
  create_opportunity: 'Criar oportunidade',
  notify_owner: 'Notificar responsável',
  start_automation: 'Iniciar automação',
};

// Bundle component interface
export interface ProductComponent {
  id: string;
  workspace_id: string;
  parent_product_id: string;
  component_product_id: string;
  quantity: number;
  is_optional: boolean;
  price_override: number | null;
  cost_override: number | null;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined data
  component?: Product;
}

// Client entitlement (session package)
export interface ClientEntitlement {
  id: string;
  workspace_id: string;
  product_id: string;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  proposal_id: string | null;
  total_units: number;
  used_units: number;
  remaining_units: number;
  unit_name: string;
  start_date: string;
  expiry_date: string | null;
  status: EntitlementStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: Product;
  contact?: { id: string; name: string };
  company?: { id: string; name: string };
}

// Session consumption
export interface SessionConsumption {
  id: string;
  workspace_id: string;
  entitlement_id: string;
  units_consumed: number;
  session_date: string;
  notes: string | null;
  performed_by: string;
  created_at: string;
}

// Product cycle (maintenance)
export interface ProductCycle {
  id: string;
  workspace_id: string;
  product_id: string;
  name: string;
  trigger_type: CycleTriggerType;
  trigger_value: number;
  action_type: CycleActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// Product progression (matching)
export interface ProductProgression {
  id: string;
  workspace_id: string;
  from_product_id: string;
  to_product_id: string;
  progression_name: string | null;
  timing_days: number | null;
  timing_window_start: number | null;
  timing_window_end: number | null;
  suggested_message: string | null;
  recommended_action: ProgressionAction | null;
  confidence_score: number | null;
  is_ai_suggested: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  // Joined data
  from_product?: Product;
  to_product?: Product;
}

// Product image
export interface ProductImage {
  id: string;
  workspace_id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  is_ai_generated: boolean;
  ai_prompt: string | null;
  position: number;
  created_at: string;
}

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
