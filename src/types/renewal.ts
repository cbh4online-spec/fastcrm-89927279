// Renewal Contracts Module Types

export type RenewalSourceType = 'proposal' | 'order' | 'opportunity' | 'manual';
export type RenewalContractStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type RenewalBillingType = 'invoice' | 'stripe' | 'external';
export type RenewalIntervalType = 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'custom';
export type RenewalItemType = 'domain' | 'software_license' | 'hours_pack' | 'retainer' | 'subscription';
export type RenewalPricingModel = 'fixed' | 'per_seat' | 'per_unit' | 'usage' | 'hybrid';
export type RenewalItemStatus = 'active' | 'pending_renewal' | 'overdue' | 'cancelled' | 'expired';
export type RenewalUsageType = 'hours' | 'credits' | 'seats_addon';
export type RenewalEventType = 'created' | 'renewal_due' | 'renewed' | 'invoice_sent' | 'payment_received' | 'overdue' | 'consumption_logged' | 'paused' | 'cancelled';

// --- Main interfaces ---

export interface RenewalContract {
  id: string;
  workspace_id: string;
  company_id: string | null;
  contact_id: string | null;
  source_type: RenewalSourceType;
  source_id: string | null;
  status: RenewalContractStatus;
  billing_type: RenewalBillingType;
  currency: string;
  payment_terms_days: number | null;
  start_date: string;
  next_renewal_date: string | null;
  renewal_interval: RenewalIntervalType;
  auto_renew: boolean;
  owner_user_id: string | null;
  notes: string | null;
  health_score: number;
  total_mrr: number;
  created_at: string;
  updated_at: string;
  // Relations (populated on queries)
  company?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
  items?: RenewalItem[];
}

export interface RenewalItem {
  id: string;
  workspace_id: string;
  contract_id: string;
  item_type: RenewalItemType;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  pricing_model: RenewalPricingModel;
  renewal_interval: RenewalIntervalType;
  next_renewal_date: string | null;
  end_date: string | null;
  grace_period_days: number;
  status: RenewalItemStatus;
  meta_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RenewalUsageEntry {
  id: string;
  workspace_id: string;
  contract_id: string;
  renewal_item_id: string;
  usage_type: RenewalUsageType;
  amount: number;
  unit: string;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RenewalEvent {
  id: string;
  workspace_id: string;
  contract_id: string;
  event_type: RenewalEventType;
  payload_json: Record<string, unknown>;
  created_at: string;
}

// --- Input types ---

export interface CreateRenewalContractInput {
  company_id?: string;
  contact_id?: string;
  source_type?: RenewalSourceType;
  source_id?: string;
  status?: RenewalContractStatus;
  billing_type?: RenewalBillingType;
  currency?: string;
  payment_terms_days?: number;
  start_date?: string;
  next_renewal_date?: string;
  renewal_interval?: RenewalIntervalType;
  auto_renew?: boolean;
  owner_user_id?: string;
  notes?: string;
}

export interface CreateRenewalItemInput {
  contract_id: string;
  item_type: RenewalItemType;
  product_id?: string;
  name: string;
  qty?: number;
  unit_price: number;
  pricing_model?: RenewalPricingModel;
  renewal_interval?: RenewalIntervalType;
  next_renewal_date?: string;
  end_date?: string;
  grace_period_days?: number;
  meta_json?: Record<string, unknown>;
}

export interface LogUsageInput {
  contract_id: string;
  renewal_item_id: string;
  usage_type?: RenewalUsageType;
  amount: number;
  unit?: string;
  source_type?: string;
  source_id?: string;
  description?: string;
}

// --- Display helpers ---

export const RENEWAL_INTERVAL_LABELS: Record<RenewalIntervalType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  yearly: 'Anual',
  custom: 'Personalizado',
};

export const RENEWAL_ITEM_TYPE_LABELS: Record<RenewalItemType, string> = {
  domain: 'Domínio',
  software_license: 'Licença Software',
  hours_pack: 'Pack de Horas',
  retainer: 'Retainer/Manutenção',
  subscription: 'Subscrição',
};

export const RENEWAL_ITEM_TYPE_ICONS: Record<RenewalItemType, string> = {
  domain: 'Globe',
  software_license: 'Monitor',
  hours_pack: 'Clock',
  retainer: 'Shield',
  subscription: 'RefreshCw',
};

export const RENEWAL_STATUS_CONFIG: Record<RenewalContractStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Ativo', color: 'text-green-600', bgColor: 'bg-green-50' },
  paused: { label: 'Pausado', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-50' },
  expired: { label: 'Expirado', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export const RENEWAL_ITEM_STATUS_CONFIG: Record<RenewalItemStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'text-green-600' },
  pending_renewal: { label: 'Renovação Pendente', color: 'text-yellow-600' },
  overdue: { label: 'Em Atraso', color: 'text-red-600' },
  cancelled: { label: 'Cancelado', color: 'text-red-600' },
  expired: { label: 'Expirado', color: 'text-muted-foreground' },
};

export const RENEWAL_BILLING_LABELS: Record<RenewalBillingType, string> = {
  invoice: 'Fatura',
  stripe: 'Stripe',
  external: 'Externo',
};

export const RENEWAL_EVENT_LABELS: Record<RenewalEventType, string> = {
  created: 'Contrato Criado',
  renewal_due: 'Renovação Próxima',
  renewed: 'Renovado',
  invoice_sent: 'Fatura Enviada',
  payment_received: 'Pagamento Recebido',
  overdue: 'Em Atraso',
  consumption_logged: 'Consumo Registado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
};

export const PRICING_MODEL_LABELS: Record<RenewalPricingModel, string> = {
  fixed: 'Fixo',
  per_seat: 'Por Seat',
  per_unit: 'Por Unidade',
  usage: 'Por Uso',
  hybrid: 'Híbrido',
};

// Health score color helper
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getHealthScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}
