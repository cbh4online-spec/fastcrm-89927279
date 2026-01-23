// Subscription & Recurring Billing Types
// Aligned with database schema

export type BillingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';

export type SubscriptionStatus = 'active' | 'paused' | 'past_due' | 'cancelled';

export type PaymentProvider = 'stripe' | 'manual' | 'other';

// Main Subscription interface (matches DB schema)
export interface Subscription {
  id: string;
  workspace_id: string;
  
  // References
  opportunity_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  plan_id: string | null;
  
  // Details
  status: SubscriptionStatus;
  mrr_amount: number;
  frequency: BillingFrequency;
  
  // Dates
  start_date: string;
  current_period_start: string | null;
  current_period_end: string | null;
  renewal_date: string | null;
  
  // Payment provider
  provider: PaymentProvider;
  provider_subscription_id: string | null;
  
  // Payment tracking
  last_payment_date: string | null;
  next_payment_date: string | null;
  
  // Cancellation
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Relations (populated on queries)
  contact?: { id: string; name: string; email?: string | null } | null;
  company?: { id: string; name: string } | null;
  opportunity?: { id: string; title: string; value?: number } | null;
  plan?: { id: string; name: string } | null;
}

// Input types for mutations
export interface CreateSubscriptionInput {
  opportunity_id?: string;
  company_id?: string;
  contact_id?: string;
  plan_id?: string;
  status?: SubscriptionStatus;
  mrr_amount: number;
  frequency: BillingFrequency;
  start_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  renewal_date?: string;
  provider?: PaymentProvider;
  provider_subscription_id?: string;
  next_payment_date?: string;
  cancel_at_period_end?: boolean;
}

export interface UpdateSubscriptionInput {
  id: string;
  status?: SubscriptionStatus;
  mrr_amount?: number;
  frequency?: BillingFrequency;
  current_period_start?: string;
  current_period_end?: string;
  renewal_date?: string;
  provider?: PaymentProvider;
  provider_subscription_id?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
}

// Display helpers
export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  yearly: 'Anual',
};

export const BILLING_FREQUENCY_MONTHS: Record<BillingFrequency, number> = {
  weekly: 0.25,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  yearly: 12,
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Ativa', color: 'text-green-600', bgColor: 'bg-green-50' },
  paused: { label: 'Pausada', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  past_due: { label: 'Em Atraso', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  cancelled: { label: 'Cancelada', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  manual: 'Manual',
  other: 'Outro',
};

// Utility to calculate MRR from subscription
export function calculateMRR(amount: number, frequency: BillingFrequency): number {
  const months = BILLING_FREQUENCY_MONTHS[frequency];
  if (months === 0) return 0;
  return amount / months;
}

// Utility to get next billing date
export function getNextBillingDate(startDate: Date, frequency: BillingFrequency): Date {
  const next = new Date(startDate);
  switch (frequency) {
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
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
