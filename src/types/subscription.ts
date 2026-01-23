// Subscription & Recurring Billing Types

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export type SubscriptionStatus = 'draft' | 'active' | 'paused' | 'cancelled' | 'expired' | 'past_due';

export type PaymentMethodType = 'stripe' | 'bank_transfer' | 'check' | 'cash' | 'other';

export type BillingRecordStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type BillingEventType = 'payment' | 'refund' | 'adjustment' | 'credit';

// Main Subscription interface
export interface Subscription {
  id: string;
  workspace_id: string;
  
  // Customer references
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  
  // Origin
  opportunity_id: string | null;
  
  // Details
  name: string;
  description: string | null;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  
  // Pricing
  amount: number;
  currency: string;
  
  // Dates
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  cancelled_at: string | null;
  
  // Payment method
  payment_method: PaymentMethodType;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  
  // Contract
  contract_value: number | null;
  auto_renew: boolean;
  renewal_reminder_days: number | null;
  
  // Metadata
  notes: string | null;
  tags: string[] | null;
  
  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (populated on queries)
  contact?: { id: string; name: string; email?: string | null } | null;
  company?: { id: string; name: string } | null;
  lead?: { id: string; name: string; email?: string | null } | null;
  opportunity?: { id: string; title: string; value?: number } | null;
  items?: SubscriptionItem[];
}

// Subscription line item
export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  workspace_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  product?: { id: string; name: string } | null;
}

// Billing record per period
export interface SubscriptionBillingRecord {
  id: string;
  workspace_id: string;
  subscription_id: string;
  event_type: BillingEventType;
  status: BillingRecordStatus;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  payment_method: PaymentMethodType | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  invoice_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  subscription?: Subscription | null;
}

// SaaS Metrics
export interface SubscriptionMetrics {
  id: string;
  workspace_id: string;
  period_date: string;
  period_type: 'daily' | 'monthly';
  
  // MRR/ARR
  mrr: number;
  arr: number;
  
  // Counts
  active_subscriptions: number;
  new_subscriptions: number;
  churned_subscriptions: number;
  
  // Revenue breakdown
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  net_mrr_change: number;
  
  // Rates
  churn_rate: number;
  retention_rate: number;
  net_revenue_retention: number;
  
  // Customer metrics
  total_customers: number;
  avg_revenue_per_customer: number;
  ltv_estimate: number;
  
  calculated_at: string;
}

// Input types for mutations
export interface CreateSubscriptionInput {
  contact_id?: string;
  company_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  name: string;
  description?: string;
  status?: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: PaymentMethodType;
  auto_renew?: boolean;
  renewal_reminder_days?: number;
  notes?: string;
  tags?: string[];
  items?: CreateSubscriptionItemInput[];
}

export interface UpdateSubscriptionInput {
  id: string;
  name?: string;
  description?: string;
  status?: SubscriptionStatus;
  billing_cycle?: BillingCycle;
  amount?: number;
  currency?: string;
  end_date?: string;
  next_billing_date?: string;
  payment_method?: PaymentMethodType;
  auto_renew?: boolean;
  renewal_reminder_days?: number;
  notes?: string;
  tags?: string[];
}

export interface CreateSubscriptionItemInput {
  product_id?: string;
  name: string;
  description?: string;
  quantity?: number;
  unit_price: number;
}

export interface CreateBillingRecordInput {
  subscription_id: string;
  event_type?: BillingEventType;
  status?: BillingRecordStatus;
  amount: number;
  currency?: string;
  period_start: string;
  period_end: string;
  payment_method?: PaymentMethodType;
  due_date?: string;
  notes?: string;
}

// Display helpers
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual',
};

export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  weekly: 0.25,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Rascunho', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  active: { label: 'Ativa', color: 'text-green-600', bgColor: 'bg-green-50' },
  paused: { label: 'Pausada', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  cancelled: { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-50' },
  expired: { label: 'Expirada', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  past_due: { label: 'Em Atraso', color: 'text-orange-600', bgColor: 'bg-orange-50' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  stripe: 'Stripe',
  bank_transfer: 'Transferência Bancária',
  check: 'Cheque',
  cash: 'Dinheiro',
  other: 'Outro',
};

export const BILLING_RECORD_STATUS_CONFIG: Record<BillingRecordStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  paid: { label: 'Pago', color: 'text-green-600', bgColor: 'bg-green-50' },
  failed: { label: 'Falhou', color: 'text-red-600', bgColor: 'bg-red-50' },
  refunded: { label: 'Reembolsado', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  cancelled: { label: 'Cancelado', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

// Utility to calculate MRR from subscription
export function calculateMRR(amount: number, billingCycle: BillingCycle): number {
  const months = BILLING_CYCLE_MONTHS[billingCycle];
  if (months === 0) return 0;
  return amount / months;
}

// Utility to get next billing date
export function getNextBillingDate(startDate: Date, billingCycle: BillingCycle): Date {
  const next = new Date(startDate);
  switch (billingCycle) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semi_annual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
