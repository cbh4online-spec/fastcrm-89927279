-- Add missing indexes for performance on key columns
-- These are safe to run even if some already exist (will just skip)

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_opportunity_id ON public.subscriptions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contact_id ON public.subscriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment_date ON public.subscriptions(next_payment_date);

-- Subscription events indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_workspace_subscription ON public.subscription_events(workspace_id, subscription_id);

-- Opportunities table indexes (for new billing columns)
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_subscription_status ON public.opportunities(subscription_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_renewal_date ON public.opportunities(renewal_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_next_payment_date ON public.opportunities(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_billing_type ON public.opportunities(billing_type);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_status ON public.subscriptions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_renewal ON public.subscriptions(workspace_id, renewal_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace_subscription_status ON public.opportunities(workspace_id, subscription_status);