// Types for Partner Center / Revenda B2B

export type PartnerAccountStatus = 'lead' | 'invited' | 'active' | 'suspended' | 'blocked';
export type PartnerUserRole = 'partner_owner' | 'partner_admin' | 'partner_buyer' | 'partner_finance' | 'partner_approver' | 'partner_viewer';
export type PartnerOrderStatus = 'draft' | 'submitted' | 'awaiting_approval' | 'approved' | 'rejected' | 'processing' | 'shipped' | 'completed' | 'cancelled';

export interface PartnerAccount {
  id: string;
  workspace_id: string;
  account_code: string;
  legal_name: string;
  trade_name: string | null;
  vat_number: string | null;
  business_type: string;
  status: PartnerAccountStatus;
  country: string;
  currency: string;
  language: string;
  owner_contact_id: string | null;
  assigned_sales_owner_id: string | null;
  assigned_channel_manager_id: string | null;
  price_list_id: string | null;
  partner_tier_id: string | null;
  payment_terms: string;
  credit_limit: number;
  current_credit_exposure: number;
  allow_checkout: boolean;
  requires_order_approval: boolean;
  approval_threshold: number | null;
  allow_backorders: boolean;
  storefront_enabled: boolean;
  storefront_slug: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  tier?: PartnerTier;
  price_list?: PartnerPriceList;
}

export interface PartnerUser {
  id: string;
  workspace_id: string;
  partner_account_id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: PartnerUserRole;
  is_active: boolean;
  invited_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  partner_account?: PartnerAccount;
}

export interface PartnerTier {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  color: string;
  discount_percentage: number;
  rebate_percentage: number;
  min_quarter_volume: number;
  min_annual_volume: number;
  benefits_json: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerPriceList {
  id: string;
  workspace_id: string;
  name: string;
  channel_type: string;
  currency: string;
  pricing_mode: string;
  is_default: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerPriceListItem {
  id: string;
  workspace_id: string;
  price_list_id: string;
  product_id: string;
  price_net: number;
  pvp_recommended: number | null;
  min_qty: number;
  pack_size: number;
  moq: number;
  max_discount_allowed: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerOrderHeader {
  id: string;
  workspace_id: string;
  partner_account_id: string;
  order_number: string;
  status: PartnerOrderStatus;
  po_number: string | null;
  buyer_user_id: string | null;
  approver_user_id: string | null;
  currency: string;
  subtotal_net: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_net: number;
  total_gross: number;
  payment_status: string;
  payment_method: string | null;
  payment_terms_snapshot: string | null;
  shipping_address_snapshot: Record<string, unknown> | null;
  billing_address_snapshot: Record<string, unknown> | null;
  notes: string | null;
  source: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: PartnerOrderItem[];
}

export interface PartnerOrderItem {
  id: string;
  workspace_id: string;
  partner_order_id: string;
  product_id: string;
  sku: string | null;
  product_name: string;
  quantity: number;
  unit_price_net: number;
  pvp_recommended: number | null;
  margin_estimated: number | null;
  tax_rate: number;
  line_total_net: number;
  pack_size: number;
  moq_applied: number;
  fulfillment_mode: string;
  created_at: string;
}

// Computed price from RPC
export interface ComputedPartnerPrice {
  base_price: number;
  price_net: number;
  price_source: string;
  pvp_recommended: number | null;
  gross_margin_pct: number | null;
  tier_applied: string | null;
  list_applied: string | null;
}

// Cart item for PartnerCartContext
export interface PartnerCartItem {
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price_net: number;
  pvp_recommended: number | null;
  margin_estimated: number | null;
  pack_size: number;
  moq: number;
  image_url: string | null;
}

// Order status config
export const partnerOrderStatusConfig: Record<PartnerOrderStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'FileEdit' },
  submitted: { label: 'Submetido', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'Send' },
  awaiting_approval: { label: 'Aguarda Aprovação', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'Clock' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 border-green-200', icon: 'CheckCircle' },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-700 border-red-200', icon: 'XCircle' },
  processing: { label: 'Em Preparação', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'Package' },
  shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: 'Truck' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'CheckCircle2' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200', icon: 'Ban' },
};

// Validate quantity against MOQ and pack size
export function validatePartnerQuantity(
  quantity: number,
  moq: number,
  packSize: number
): { valid: boolean; message: string | null } {
  if (quantity < moq) {
    return { valid: false, message: `Quantidade mínima de encomenda: ${moq} unidades` };
  }
  if (packSize > 1 && quantity % packSize !== 0) {
    return { valid: false, message: `Este produto vende-se em múltiplos de ${packSize}` };
  }
  return { valid: true, message: null };
}
